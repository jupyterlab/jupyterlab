import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { Signal } from '@lumino/signaling';
import type * as CodeMirror from 'codemirror';

import { IEditorChangedData, WidgetAdapter } from '../adapters/adapter';
import { IForeignCodeExtractorsRegistry } from '../extractors/types';
import { IEditorName } from '../feature';
import {
  IEditorPosition,
  IRootPosition,
  ISourcePosition,
  IVirtualPosition
} from '../positioning';
import { ILSPLogConsole, ILSPVirtualEditorManager, PLUGIN_ID } from '../tokens';

import {
  IBlockAddedInfo,
  ICodeBlockOptions,
  UpdateManager,
  VirtualDocument
} from './document';
import { IEditorChange, IVirtualEditor, IWindowCoordinates } from './editor';

export type CodeMirrorHandler = (
  instance: CodeMirrorVirtualEditor,
  ...args: any[]
) => void;
type WrappedHandler = (instance: CodeMirror.Editor, ...args: any[]) => void;
type BlockSignalHandler = (
  adapter: WidgetAdapter<IDocumentWidget>,
  data: IEditorChangedData
) => void;

// problematic overloads: typescript cannot resolve old-style
// overloads for union types, so we will case to one of the
// union elements to silence it (it does not matter which one,
// but to make sure we are not introducing type issues we will
// use both: EventName1 for `.on()` and EventName2 for `.off()`
type EventName1 = CodeMirror.DOMEvent & keyof GlobalEventHandlersEventMap;
type EventName2 = keyof CodeMirror.EditorEventMap;
export type EventName = EventName1 | EventName2;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
class DocDispatcher implements CodeMirror.Doc {
  constructor(
    private virtual_editor: CodeMirrorVirtualEditor,
    private adapter: WidgetAdapter<IDocumentWidget>
  ) {}

  markText(
    from: IRootPosition,
    to: IRootPosition,
    options?: CodeMirror.TextMarkerOptions
  ): CodeMirror.TextMarker<CodeMirror.MarkerRange> {
    // TODO: edgecase: from and to in different cells
    let ce_editor =
      this.virtual_editor.virtual_document.get_editor_at_source_line(from);
    let cm_editor = this.virtual_editor.ce_editor_to_cm_editor.get(ce_editor);
    let notebook_map = this.virtual_editor;
    return cm_editor
      .getDoc()
      .markText(
        notebook_map.transform_from_root_to_editor(from),
        notebook_map.transform_from_root_to_editor(to),
        options
      );
  }

  getCursor(start?: string): CodeMirror.Position {
    let active_editor = this.adapter.activeEditor as CodeMirrorEditor;
    if (active_editor == null) {
      return;
    }
    let cursor = active_editor.editor
      .getDoc()
      .getCursor(start) as IEditorPosition;
    return this.virtual_editor.transform_from_editor_to_root(
      active_editor,
      cursor
    );
  }
}
/**
 * VirtualEditor extends the CodeMirror.Editor interface; its subclasses may either
 * fast-forward any requests to an existing instance of the CodeMirror.Editor
 * (using ES6 Proxy), or implement custom behaviour, allowing for the use of
 * virtual documents representing code in complex entities such as notebooks.
 */
export class CodeMirrorVirtualEditor
  implements IVirtualEditor<CodeMirrorEditor>, CodeMirror.Editor
{
  // TODO: getValue could be made private in the virtual editor and the virtual editor
  //  could stop exposing the full implementation of CodeMirror but rather hide it inside.
  editor_name: IEditorName = 'CodeMirrorEditor';
  virtual_document: VirtualDocument;
  code_extractors: IForeignCodeExtractorsRegistry;
  console: ILSPLogConsole;
  cm_editor_to_ce_editor: Map<CodeMirror.Editor, CodeEditor.IEditor>;
  ce_editor_to_cm_editor: Map<CodeEditor.IEditor, CodeMirror.Editor>;
  private block_added_handlers: BlockSignalHandler[];
  private block_removed_handlers: BlockSignalHandler[];
  isDisposed = false;

  change: Signal<IVirtualEditor<CodeMirrorEditor>, IEditorChange>;

  editor_to_source_line: Map<CodeEditor.IEditor, number>;
  private editor_to_source_line_new: Map<CodeEditor.IEditor, number>;

  private _proxy: CodeMirrorVirtualEditor;
  protected readonly adapter: WidgetAdapter<IDocumentWidget>;

  constructor(options: IVirtualEditor.IOptions) {
    this.adapter = options.adapter;
    this.virtual_document = options.virtual_document;
    this.console = this.adapter.console;
    this.change = new Signal(this);

    this.block_added_handlers = [];
    this.block_removed_handlers = [];

    this.editor_to_source_line = new Map();
    this.cm_editor_to_ce_editor = new Map();
    this.ce_editor_to_cm_editor = new Map();
    this._proxy = new Proxy(this, {
      get: function (
        target: CodeMirrorVirtualEditor,
        prop: keyof CodeMirror.Editor,
        receiver: any
      ) {
        if (!(prop in target)) {
          console.warn(
            `Unimplemented method ${prop.toString()} for CodeMirrorVirtualEditor`
          );
          return;
        } else {
          return Reflect.get(target, prop, receiver);
        }
      }
    });
    // this is not the most efficient, but probably the most reliable way
    this.virtual_document.update_manager.update_began.connect(
      this.onEditorsUpdated,
      this
    );

    this.virtual_document.update_manager.block_added.connect(
      this.save_block_position,
      this
    );
    this.virtual_document.update_manager.update_finished.connect(() => {
      this.editor_to_source_line = this.editor_to_source_line_new;
    }, this);

    this.set_event_handlers();
    return this._proxy;
  }

  dispose() {
    if (this.isDisposed) {
      return;
    }

    this.editor_to_source_line.clear();
    this.cm_editor_to_ce_editor.clear();
    this.ce_editor_to_cm_editor.clear();

    this.off('change', this.emit_change);

    for (let [[eventName], wrapped_handler] of this._event_wrappers.entries()) {
      this.forEveryBlockEditor(cm_editor => {
        cm_editor.off(eventName as EventName2, wrapped_handler);
      }, false);
    }

    this._event_wrappers.clear();

    this.disconnectBlockMonitoring();

    this.virtual_document.dispose();

    // just to be sure
    this.virtual_document = null;
    this.code_extractors = null;

    this.isDisposed = true;

    // just to be sure
    this.forEveryBlockEditor = null;
    this._proxy = null;
  }

  get_cursor_position(): IRootPosition {
    return this.getDoc().getCursor('end') as IRootPosition;
  }

  private onEditorsUpdated(
    update_manager: UpdateManager,
    blocks: ICodeBlockOptions[]
  ): void {
    this.cm_editor_to_ce_editor.clear();
    this.ce_editor_to_cm_editor.clear();
    this.editor_to_source_line_new = new Map();
    for (let block of blocks) {
      let ce_editor = block.ce_editor;
      let cm_editor = (ce_editor as CodeMirrorEditor).editor;
      this.cm_editor_to_ce_editor.set(cm_editor, ce_editor);
      this.ce_editor_to_cm_editor.set(ce_editor, cm_editor);
    }
  }

  private save_block_position(
    update_manager: UpdateManager,
    block_data: IBlockAddedInfo
  ) {
    this.editor_to_source_line_new.set(
      block_data.block.ce_editor,
      block_data.virtual_document.last_source_line
    );
  }

  private set_event_handlers() {
    this.on('change', this.emit_change.bind(this));
  }

  private emit_change(
    instance: CodeMirrorVirtualEditor,
    change: CodeMirror.EditorChange
  ) {
    this.change.emit(change as IEditorChange);
  }

  window_coords_to_root_position(coordinates: IWindowCoordinates) {
    return this.coordsChar(coordinates, 'window') as IRootPosition;
  }

  get_token_at(position: IRootPosition): CodeEditor.IToken {
    let token = this.getTokenAt(position);
    return {
      value: token.string,
      offset: token.start,
      type: token.type
    };
  }

  get_cm_editor(position: IRootPosition) {
    return this.get_editor_at_root_line(position);
  }

  transform_virtual_to_editor(position: IVirtualPosition): IEditorPosition {
    return this.virtual_document.transform_virtual_to_editor(position);
  }

  // TODO .root is not really needed as we are in editor now...
  document_at_root_position(position: IRootPosition): VirtualDocument {
    let root_as_source = position as ISourcePosition;
    return this.virtual_document.root.document_at_source_position(
      root_as_source
    );
  }

  root_position_to_virtual_position(position: IRootPosition): IVirtualPosition {
    let root_as_source = position as ISourcePosition;
    return this.virtual_document.root.virtual_position_at_document(
      root_as_source
    );
  }

  get_editor_at_root_position(root_position: IRootPosition) {
    return this.virtual_document.root.get_editor_at_source_line(root_position);
  }

  root_position_to_editor(root_position: IRootPosition): IEditorPosition {
    return this.virtual_document.root.transform_source_to_editor(root_position);
  }

  private _event_wrappers = new Map<
    [EventName, CodeMirrorHandler],
    WrappedHandler
  >();

  /**
   * Proxy the event handler binding to the CodeMirror editors,
   * allowing for multiple actual editors per a virtual editor.
   *
   * Only handlers accepting CodeMirror.Editor are supported for simplicity.
   */
  on(eventName: EventName, handler: CodeMirrorHandler, ...args: any[]): void {
    let wrapped_handler = (instance: CodeMirror.Editor, ...args: any[]) => {
      try {
        return handler(this, ...args);
      } catch (error) {
        this.console.warn(
          'CodeMirrorVirtualEditor handler (which should accept a CodeMirror Editor instance) failed',
          { error, instance, args, this: this }
        );
      }
    };
    this._event_wrappers.set([eventName, handler], wrapped_handler);

    this.forEveryBlockEditor(
      cm_editor => {
        cm_editor.on(eventName as EventName1, wrapped_handler);
      },
      true,
      cm_editor => {
        cm_editor.off(eventName as EventName2, wrapped_handler);
      }
    );
  }

  off(eventName: EventName, handler: CodeMirrorHandler, ...args: any[]): void {
    let wrapped_handler = this._event_wrappers.get([eventName, handler]);

    this.forEveryBlockEditor(cm_editor => {
      cm_editor.off(eventName as EventName2, wrapped_handler);
    });
  }

  find_ce_editor(cm_editor: CodeMirror.Editor): CodeEditor.IEditor {
    return this.cm_editor_to_ce_editor.get(cm_editor);
  }

  transform_from_editor_to_root(
    editor: CodeEditor.IEditor,
    position: IEditorPosition
  ): IRootPosition | null {
    if (!this.editor_to_source_line.has(editor)) {
      this.console.warn('Editor not found in editor_to_source_line map');
      return null;
    }
    let shift = this.editor_to_source_line.get(editor);
    return {
      ...(position as CodeMirror.Position),
      line: position.line + shift
    } as IRootPosition;
  }

  transform_from_root_to_editor(pos: IRootPosition): CodeMirror.Position {
    // from notebook to editor space
    return this.virtual_document.transform_source_to_editor(pos);
  }

  state: any;

  addKeyMap(map: string | CodeMirror.KeyMap, bottom?: boolean): void {
    return;
  }

  addLineClass(
    line: any,
    where: string,
    _class: string
  ): CodeMirror.LineHandle {
    return undefined;
  }

  addLineWidget(
    line: any,
    node: HTMLElement,
    options?: CodeMirror.LineWidgetOptions
  ): CodeMirror.LineWidget {
    return undefined;
  }

  addOverlay(mode: any, options?: any): void {
    for (let editor of this.adapter.editors) {
      // TODO: use some more intelligent strategy to determine editors to test
      let cm_editor = editor as CodeMirrorEditor;
      cm_editor.editor.addOverlay(mode, options);
    }
  }

  addPanel(
    node: HTMLElement,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    options?: CodeMirror.ShowPanelOptions
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
  ): CodeMirror.Panel {
    return undefined;
  }

  charCoords(
    pos: IRootPosition,
    mode?: 'window' | 'page' | 'local'
  ): { left: number; right: number; top: number; bottom: number } {
    try {
      let editor = this.get_editor_at_root_line(pos);
      return editor.charCoords(pos, mode);
    } catch (e) {
      console.log(e);
      return { bottom: 0, left: 0, right: 0, top: 0 };
    }
  }

  coordsChar(
    object: { left: number; top: number },
    mode?: 'window' | 'page' | 'local'
  ): IRootPosition {
    for (let editor of this.adapter.editors) {
      // TODO: use some more intelligent strategy to determine editors to test
      let cm_editor = editor as CodeMirrorEditor;
      let pos = cm_editor.editor.coordsChar(object, mode);

      if ((pos as any).outside === 1) {
        continue;
      }

      return this.transform_from_editor_to_root(editor, pos as IEditorPosition);
    }
  }

  cursorCoords(
    where?: boolean,
    mode?: 'window' | 'page' | 'local'
  ): { left: number; top: number; bottom: number };
  cursorCoords(
    where?: IRootPosition | null,
    mode?: 'window' | 'page' | 'local'
  ): { left: number; top: number; bottom: number };
  cursorCoords(
    where?: boolean | IRootPosition | null,
    mode?: 'window' | 'page' | 'local'
  ): { left: number; top: number; bottom: number } {
    if (typeof where !== 'boolean') {
      let editor = this.get_editor_at_root_line(where);
      return editor.cursorCoords(this.transform_from_root_to_editor(where));
    }
    return { bottom: 0, left: 0, top: 0 };
  }

  get any_editor(): CodeMirror.Editor {
    return (this.adapter.editors[0] as CodeMirrorEditor).editor;
  }

  defaultCharWidth(): number {
    return this.any_editor.defaultCharWidth();
  }

  defaultTextHeight(): number {
    return this.any_editor.defaultTextHeight();
  }

  endOperation(): void {
    for (let editor of this.adapter.editors) {
      let cm_editor = editor as CodeMirrorEditor;
      cm_editor.editor.endOperation();
    }
  }

  execCommand(name: string): void {
    for (let editor of this.adapter.editors) {
      let cm_editor = editor as CodeMirrorEditor;
      cm_editor.editor.execCommand(name);
    }
  }

  getDoc(): CodeMirror.Doc {
    let dummy_doc = new DocDispatcher(this, this.adapter);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return dummy_doc;
  }

  private get_editor_at_root_line(pos: IRootPosition): CodeMirror.Editor {
    let ce_editor = this.virtual_document.root.get_editor_at_source_line(pos);
    return this.ce_editor_to_cm_editor.get(ce_editor);
  }

  getTokenAt(pos: IRootPosition, precise?: boolean): CodeMirror.Token {
    if (pos === undefined) {
      return;
    }
    let editor = this.get_editor_at_root_line(pos);
    return editor.getTokenAt(this.transform_from_root_to_editor(pos));
  }

  getTokenTypeAt(pos: IRootPosition): string {
    let ce_editor = this.virtual_document.get_editor_at_source_line(pos);
    let cm_editor = this.ce_editor_to_cm_editor.get(ce_editor);
    return cm_editor.getTokenTypeAt(this.transform_from_root_to_editor(pos));
  }

  get_editor_value(editor: CodeEditor.IEditor): string {
    let codemirror_editor = editor as CodeMirrorEditor;
    return codemirror_editor.model.value.text;
    // A previous implementation was using the underlying
    // CodeMirror editor instance (as one could expect), i.e:
    //     let cm_editor = codemirror_editor.editor;
    //     return cm_editor.getValue();
    // however, because we are listening to:
    // this.widget.context.model.contentChanged
    // it turns out that the model can not be as fast to propagate
    // the changes to the underlying CodeMirror editor instance yet
    // so it seems reasonable to use the newer value from the model
    // to build the next VirtualDocument; it turned out to solve some
    // of the failures to resolve position within the virtual document
    // which were due to race conditions.
  }

  getWrapperElement(): HTMLElement {
    return this.adapter.wrapper_element;
  }

  heightAtLine(
    line: any,
    mode?: 'window' | 'page' | 'local',
    includeWidgets?: boolean
  ): number {
    return 0;
  }

  isReadOnly(): boolean {
    return false;
  }

  lineAtHeight(height: number, mode?: 'window' | 'page' | 'local'): number {
    return 0;
  }

  protected disconnectBlockMonitoring() {
    for (let handler of this.block_added_handlers) {
      this.adapter.editorAdded.disconnect(handler);
    }
    this.block_added_handlers = [];
    for (let handler of this.block_removed_handlers) {
      this.adapter.editorRemoved.disconnect(handler);
    }
    this.block_removed_handlers = [];
  }

  forEveryBlockEditor(
    callback: (cm_editor: CodeMirror.Editor) => any,
    monitor_for_new_blocks = true,
    on_editor_removed_callback: (cm_editor: CodeMirror.Editor) => any = null
  ) {
    const editors_with_handlers = new Set<CodeMirror.Editor>();

    // TODO... the need of iterating over all editors is universal - so this could be
    //  generalised to the VirtualEditor rather than live in CodeMirrorVirtualEditor;
    //  How would the VirtualEditor get knowledge of the editor instances?
    //  From the adapter (obviously).
    for (let editor of this.adapter.editors) {
      let cm_editor = (editor as CodeMirrorEditor).editor;
      editors_with_handlers.add(cm_editor);
      callback(cm_editor);
    }
    if (monitor_for_new_blocks) {
      const on_block_added = (
        adapter: WidgetAdapter<IDocumentWidget>,
        data: IEditorChangedData
      ) => {
        let { editor } = data;
        if (editor == null) {
          return;
        }
        let cm_editor = (editor as CodeMirrorEditor).editor;
        if (!editors_with_handlers.has(cm_editor)) {
          callback(cm_editor);
        }
      };
      const on_block_removed = (
        adapter: WidgetAdapter<IDocumentWidget>,
        data: IEditorChangedData
      ) => {
        let { editor } = data;
        if (editor == null) {
          return;
        }
        let cm_editor = (editor as CodeMirrorEditor).editor;
        on_editor_removed_callback(cm_editor);
      };
      this.block_added_handlers.push(on_block_added);
      this.block_added_handlers.push(on_block_removed);
      this.adapter.editorAdded.connect(on_block_added);
      this.adapter.editorRemoved.connect(on_block_removed);
    }
  }

  /**
   * Find a cell in notebook which uses given CodeMirror editor.
   * This function is O(n) - when looking up many cells
   * using a hashmap based approach may be more efficient.
   * @param cm_editor
   */
  find_editor(cm_editor: CodeMirror.Editor) {
    let ce_editor = this.cm_editor_to_ce_editor.get(cm_editor);
    return {
      index: this.adapter.get_editor_index(ce_editor),
      node: this.adapter.get_editor_wrapper(ce_editor)
    };
  }
}

export interface CodeMirrorVirtualEditor extends CodeMirror.Editor {}

export const CODEMIRROR_VIRTUAL_EDITOR: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID + ':CodeMirrorVirtualEditor',
  requires: [ILSPVirtualEditorManager],
  activate: (app, editorManager: ILSPVirtualEditorManager) => {
    return editorManager.registerEditorType({
      implementation: CodeMirrorVirtualEditor,
      name: 'CodeMirrorEditor',
      supports: CodeMirrorEditor
    });
  },
  autoStart: true
};
