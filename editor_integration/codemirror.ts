import { CodeEditor } from '@jupyterlab/codeeditor';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { TranslationBundle } from '@jupyterlab/translation';
import type * as CodeMirror from 'codemirror';
import type * as lsProtocol from 'vscode-languageserver-protocol';

import { StatusMessage, WidgetAdapter } from '../adapters/adapter';
import { LSPConnection } from '../connection';
import { PositionConverter } from '../converter';
import {
  IEditorIntegrationOptions,
  IFeature,
  IFeatureEditorIntegration,
  IFeatureSettings
} from '../feature';
import {
  IEditorPosition,
  IRootPosition,
  IVirtualPosition,
  offset_at_position
} from '../positioning';
import { ILSPLogConsole } from '../tokens';
import { DefaultMap, uris_equal } from '../utils';
import {
  CodeMirrorHandler,
  CodeMirrorVirtualEditor,
  EventName as CodeMirrorEventName
} from '../virtual/codemirror_editor';
import { VirtualDocument } from '../virtual/document';
import { IEditorChange } from '../virtual/editor';

function toDocumentChanges(changes: {
  [uri: string]: lsProtocol.TextEdit[];
}): lsProtocol.TextDocumentEdit[] {
  let documentChanges = [];
  for (let uri of Object.keys(changes)) {
    documentChanges.push({
      textDocument: { uri },
      edits: changes[uri]
    } as lsProtocol.TextDocumentEdit);
  }
  return documentChanges;
}

export interface IEditorRange {
  start: IEditorPosition;
  end: IEditorPosition;
  editor: CodeMirror.Editor;
}

function offset_from_lsp(position: lsProtocol.Position, lines: string[]) {
  return offset_at_position(PositionConverter.lsp_to_ce(position), lines);
}

export interface IEditOutcome {
  appliedChanges: number | null;
  modifiedCells: number;
  wasGranular: boolean;
  errors: string[];
}

/**
 * Interface for storage of HTMLElement event specifications (event name + handler).
 */
interface IHTMLEventMap<
  T extends keyof HTMLElementEventMap = keyof HTMLElementEventMap
> extends Map<T, (event: HTMLElementEventMap[T]) => void> {
  set<E extends T>(
    k: E,
    handler: (event: HTMLElementEventMap[E]) => void
  ): this;
  get<E extends T>(k: E): (event: HTMLElementEventMap[E]) => void;
}

/**
 * One feature of each type exists per VirtualDocument
 * (the initialization is performed by the adapter).
 */
export abstract class CodeMirrorIntegration
  implements IFeatureEditorIntegration<CodeMirrorVirtualEditor>
{
  is_registered: boolean;
  feature: IFeature;

  protected readonly editor_handlers: Map<
    CodeMirrorEventName,
    CodeMirrorHandler
  >;
  // TODO use better type constraints for connection event names and for responses
  protected readonly connection_handlers: Map<
    string,
    (response: Record<string, any>) => void
  >;
  protected readonly wrapper_handlers: IHTMLEventMap;
  protected wrapper: HTMLElement;

  protected virtual_editor: CodeMirrorVirtualEditor;
  protected virtual_document: VirtualDocument;
  protected connection: LSPConnection;

  protected status_message: StatusMessage;
  protected adapter: WidgetAdapter<IDocumentWidget>;
  protected console: ILSPLogConsole;

  protected trans: TranslationBundle;

  get settings(): IFeatureSettings<any> {
    return this.feature.settings;
  }

  get lab_integration() {
    return this.feature.labIntegration;
  }

  constructor(options: IEditorIntegrationOptions) {
    this.feature = options.feature;
    this.virtual_editor = options.virtual_editor as CodeMirrorVirtualEditor;
    this.virtual_document = options.virtual_document;
    this.connection = options.connection;
    this.status_message = options.status_message;
    this.adapter = options.adapter;
    this.console = this.adapter.console.scope(options.feature.name);
    this.trans = options.trans;

    this.editor_handlers = new Map();
    this.connection_handlers = new Map();
    this.wrapper_handlers = new Map();
    this.is_registered = false;
  }

  register(): void {
    // register editor handlers
    for (let [event_name, handler] of this.editor_handlers) {
      this.virtual_editor.on(event_name, handler);
    }
    // register connection handlers
    for (let [event_name, handler] of this.connection_handlers) {
      this.connection.on(event_name, handler);
    }
    // register editor wrapper handlers
    this.wrapper = this.virtual_editor.getWrapperElement();
    for (let [event_name, handler] of this.wrapper_handlers) {
      this.wrapper.addEventListener(event_name, handler);
    }

    this.is_registered = true;
  }

  remove(): void {
    // unregister editor handlers
    for (let [event_name, handler] of this.editor_handlers) {
      this.virtual_editor.off(event_name, handler);
    }
    this.editor_handlers.clear();
    // unregister connection handlers
    for (let [event_name, handler] of this.connection_handlers) {
      this.connection.off(event_name, handler);
    }
    this.connection_handlers.clear();
    // unregister editor wrapper handlers
    for (let [event_name, handler] of this.wrapper_handlers) {
      this.wrapper.removeEventListener(event_name, handler);
    }
    this.wrapper_handlers.clear();
  }

  protected range_to_editor_range(
    range: lsProtocol.Range,
    cm_editor?: CodeMirror.Editor
  ): IEditorRange {
    let start = PositionConverter.lsp_to_cm(range.start) as IVirtualPosition;
    let end = PositionConverter.lsp_to_cm(range.end) as IVirtualPosition;

    if (cm_editor == null) {
      let start_in_root =
        this.transform_virtual_position_to_root_position(start);
      let ce_editor =
        this.virtual_editor.get_editor_at_root_position(start_in_root);
      cm_editor = this.virtual_editor.ce_editor_to_cm_editor.get(ce_editor);
    }

    return {
      start: this.virtual_document.transform_virtual_to_editor(start),
      end: this.virtual_document.transform_virtual_to_editor(end),
      editor: cm_editor
    };
  }

  protected position_from_mouse(event: MouseEvent): IRootPosition {
    return this.virtual_editor.coordsChar(
      {
        left: event.clientX,
        top: event.clientY
      },
      'window'
    ) as IRootPosition;
  }

  public transform_virtual_position_to_root_position(
    start: IVirtualPosition
  ): IRootPosition {
    let ce_editor = this.virtual_document.virtual_lines.get(start.line).editor;
    let editor_position =
      this.virtual_document.transform_virtual_to_editor(start);
    return this.virtual_editor.transform_from_editor_to_root(
      ce_editor,
      editor_position
    );
  }

  protected get_cm_editor(position: IRootPosition) {
    return this.virtual_editor.get_cm_editor(position);
  }

  protected get_language_at(
    position: IEditorPosition,
    editor: CodeMirror.Editor
  ) {
    return editor.getModeAt(position).name;
  }

  protected extract_last_character(change: CodeMirror.EditorChange): string {
    if (change.origin === 'paste') {
      let last_line = change.text[change.text.length - 1];
      return last_line[last_line.length - 1];
    } else {
      return change.text[0][0];
    }
  }

  protected highlight_range(
    range: IEditorRange,
    class_name: string
  ): CodeMirror.TextMarker {
    return range.editor
      .getDoc()
      .markText(range.start, range.end, { className: class_name });
  }

  /**
   * Does the edit cover the entire document?
   */
  protected is_whole_document_edit(edit: lsProtocol.TextEdit) {
    let value = this.virtual_document.value;
    let lines = value.split('\n');
    let range = edit.range;
    let lsp_to_ce = PositionConverter.lsp_to_ce;
    return (
      offset_at_position(lsp_to_ce(range.start), lines) === 0 &&
      offset_at_position(lsp_to_ce(range.end), lines) === value.length
    );
  }

  protected async apply_edit(
    workspaceEdit: lsProtocol.WorkspaceEdit
  ): Promise<IEditOutcome> {
    let current_uri = this.virtual_document.document_info.uri;

    // Specs: documentChanges are preferred over changes
    let changes = workspaceEdit.documentChanges
      ? workspaceEdit.documentChanges.map(
          change => change as lsProtocol.TextDocumentEdit
        )
      : toDocumentChanges(workspaceEdit.changes);
    let applied_changes = 0;
    let edited_cells: number;
    let is_whole_document_edit: boolean;
    let errors: string[] = [];

    for (let change of changes) {
      let uri = change.textDocument.uri;

      if (!uris_equal(uri, current_uri)) {
        errors.push(
          `Workspace-wide edits not implemented: ${uri} != ${current_uri}`
        );
      } else {
        is_whole_document_edit =
          change.edits.length === 1 &&
          this.is_whole_document_edit(change.edits[0]);

        let edit: lsProtocol.TextEdit;

        if (!is_whole_document_edit) {
          applied_changes = 0;
          let value = this.virtual_document.value;
          // TODO: make sure that it was not changed since the request was sent (using the returned document version)
          let lines = value.split('\n');

          let edits_by_offset = new Map<number, lsProtocol.TextEdit>();
          for (let e of change.edits) {
            let offset = offset_from_lsp(e.range.start, lines);
            if (edits_by_offset.has(offset)) {
              console.warn(
                'Edits should not overlap, ignoring an overlapping edit'
              );
            } else {
              edits_by_offset.set(offset, e);
              applied_changes += 1;
            }
          }

          // TODO make use of old_to_new_line for edits which add of remove lines:
          //  this is crucial to preserve cell boundaries in notebook in such cases
          let old_to_new_line = new DefaultMap<number, number[]>(() => []);
          let new_text = '';
          let last_end = 0;
          let current_old_line = 0;
          let current_new_line = 0;
          // going over the edits in descending order of start points:
          let start_offsets = [...edits_by_offset.keys()].sort((a, b) => a - b);
          for (let start of start_offsets) {
            let edit = edits_by_offset.get(start);
            let prefix = value.slice(last_end, start);
            for (let i = 0; i < prefix.split('\n').length; i++) {
              let new_lines = old_to_new_line.get_or_create(current_old_line);
              new_lines.push(current_new_line);
              current_old_line += 1;
              current_new_line += 1;
            }
            new_text += prefix + edit.newText;
            let end = offset_from_lsp(edit.range.end, lines);
            let replaced_fragment = value.slice(start, end);
            for (let i = 0; i < edit.newText.split('\n').length; i++) {
              if (i < replaced_fragment.length) {
                current_old_line += 1;
              }
              current_new_line += 1;
              let new_lines = old_to_new_line.get_or_create(current_old_line);
              new_lines.push(current_new_line);
            }
            last_end = end;
          }
          new_text += value.slice(last_end, value.length);

          edit = {
            range: {
              start: { line: 0, character: 0 },
              end: {
                line: lines.length - 1,
                character: lines[lines.length - 1].length
              }
            },
            newText: new_text
          };
          console.assert(this.is_whole_document_edit(edit));
        } else {
          edit = change.edits[0];
          applied_changes += 1;
        }
        edited_cells = this.apply_single_edit(edit);
      }
    }
    const all_empty = changes.every(change => change.edits.length === 0);
    return {
      appliedChanges: applied_changes,
      modifiedCells: edited_cells,
      wasGranular: !is_whole_document_edit && !all_empty,
      errors: errors
    };
  }

  protected replace_fragment(
    newText: string,
    editor: CodeEditor.IEditor,
    fragment_start: CodeMirror.Position,
    fragment_end: CodeMirror.Position,
    start: CodeMirror.Position,
    end: CodeMirror.Position,
    is_whole_document_edit = false
  ): number {
    let document = this.virtual_document;
    let newFragmentText = newText
      .split('\n')
      .slice(fragment_start.line - start.line, fragment_end.line - start.line)
      .join('\n');

    if (newFragmentText.endsWith('\n')) {
      newFragmentText = newFragmentText.slice(0, -1);
    }

    let doc = this.virtual_editor.ce_editor_to_cm_editor.get(editor).getDoc();

    let raw_value = doc.getValue('\n');
    // extract foreign documents and substitute magics,
    // as it was done when the shadow virtual document was being created
    let { lines } = document.prepare_code_block({
      value: raw_value,
      ce_editor: editor
    });
    let old_value = lines.join('\n');

    if (is_whole_document_edit) {
      // partial edit
      let cm_to_ce = PositionConverter.cm_to_ce;
      let up_to_offset = offset_at_position(cm_to_ce(start), lines);
      let from_offset = offset_at_position(cm_to_ce(end), lines);
      newFragmentText =
        old_value.slice(0, up_to_offset) +
        newText +
        old_value.slice(from_offset);
    }

    if (old_value === newFragmentText) {
      return 0;
    }

    let new_value = document.decode_code_block(newFragmentText);

    let cursor = doc.getCursor();

    doc.replaceRange(
      new_value,
      { line: 0, ch: 0 },
      {
        line: fragment_end.line - fragment_start.line + 1,
        ch: 0
      }
    );

    try {
      // try to restore the cursor to the position prior to the edit
      // (this might not be the best UX, but definitely better than
      // the cursor jumping to the very end of the cell/file).
      doc.setCursor(cursor, cursor.ch, { scroll: false });
      // note: this does not matter for actions invoke from context menu
      // as those loose focus anyways (this might be addressed elsewhere)
    } catch (e) {
      console.log('Could not place the cursor back', e);
    }

    return 1;
  }

  afterChange(change: IEditorChange, root_position: IRootPosition) {
    // nothing here
  }

  protected apply_single_edit(edit: lsProtocol.TextEdit): number {
    let document = this.virtual_document;
    let applied_changes = 0;
    let start = PositionConverter.lsp_to_cm(edit.range.start);
    let end = PositionConverter.lsp_to_cm(edit.range.end);

    let start_editor = document.get_editor_at_virtual_line(
      start as IVirtualPosition
    );
    let end_editor = document.get_editor_at_virtual_line(
      end as IVirtualPosition
    );
    if (start_editor !== end_editor) {
      let last_editor = start_editor;
      let fragment_start = start;
      let fragment_end = { ...start };

      let line = start.line;
      let recently_replaced = false;
      while (line <= end.line) {
        line++;
        let editor = document.get_editor_at_virtual_line({
          line: line,
          ch: 0
        } as IVirtualPosition);

        if (editor === last_editor) {
          fragment_end.line = line;
          fragment_end.ch = 0;
          recently_replaced = false;
        } else {
          applied_changes += this.replace_fragment(
            edit.newText,
            last_editor,
            fragment_start,
            fragment_end,
            start,
            end
          );
          recently_replaced = true;
          fragment_start = {
            line: line,
            ch: 0
          };
          fragment_end = {
            line: line,
            ch: 0
          };
          last_editor = editor;
        }
      }
      if (!recently_replaced) {
        applied_changes += this.replace_fragment(
          edit.newText,
          last_editor,
          fragment_start,
          fragment_end,
          start,
          end
        );
      }
    } else {
      applied_changes += this.replace_fragment(
        edit.newText,
        start_editor,
        start,
        end,
        start,
        end
      );
    }
    return applied_changes;
  }
}

export type CodeMirrorIntegrationConstructor = {
  new (options: IEditorIntegrationOptions): CodeMirrorIntegration;
};
