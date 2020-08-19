import { VirtualDocument } from './document';
import {
  IEditorPosition,
  IRootPosition,
  ISourcePosition,
  IVirtualPosition
} from '../positioning';
import { Signal } from '@lumino/signaling';
import { EditorLogConsole } from './console';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { IEditorName } from '../feature';
import IEditor = CodeEditor.IEditor;
import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import {
  IVirtualEditorType,
  ILSPVirtualEditorManager,
  PLUGIN_ID
} from '../tokens';
import { WidgetAdapter } from '../adapters/adapter';
import { IDocumentWidget } from '@jupyterlab/docregistry/lib/registry';

export interface IWindowCoordinates {
  /**
   * The number of pixels away from the left edge of the window.
   */
  left: number;
  /**
   * The number of pixels away from the top edge of the window.
   */
  top: number;
}

/**
 * This is based on CodeMirror.EditorChange
 */
export interface IEditorChange {
  /** Position (in the pre-change coordinate system) where the change started. */
  from: ISourcePosition;
  /** Position (in the pre-change coordinate system) where the change ended. */
  to: ISourcePosition;
  /** Array of strings representing the text that replaced the changed range (split by line). */
  text: string[];
  /**  Text that used to be between from and to, which is overwritten by this change. */
  removed?: string[];
  /**  String representing the origin of the change event and whether it can be merged with history */
  origin?: string;
}

export interface IVirtualEditor<T extends IEditor> {
  virtual_document: VirtualDocument;
  console: EditorLogConsole;
  change: Signal<IVirtualEditor<T>, IEditorChange>;

  readonly editor_name: IEditorName;

  dispose(): void;

  document_at_root_position(position: IRootPosition): VirtualDocument;

  root_position_to_virtual_position(position: IRootPosition): IVirtualPosition;

  window_coords_to_root_position(
    coordinates: IWindowCoordinates
  ): IRootPosition;

  get_token_at(position: IRootPosition): CodeEditor.IToken;

  transform_editor_to_root(
    ce_editor: T,
    position: IEditorPosition
  ): IRootPosition;

  get_cursor_position(): IRootPosition;

  /**
   * Some adapters have more than one editor, thus...
   * @param editor
   * @param position
   */
  transform_from_editor_to_root(
    editor: T,
    position: IEditorPosition
  ): IRootPosition | null;

  get_editor_value(editor: T): string;
}

export namespace IVirtualEditor {
  export interface IOptions {
    adapter: WidgetAdapter<IDocumentWidget>;
    virtual_document: VirtualDocument;
  }

  export type Constructor = {
    new (options: IVirtualEditor.IOptions): IVirtualEditor<any>;
  };
}

export class VirtualEditorManager implements ILSPVirtualEditorManager {
  private readonly editorTypes: IVirtualEditorType<any>[];

  constructor() {
    this.editorTypes = [];
  }

  registerEditorType(options: IVirtualEditorType<CodeEditor.IEditor>) {
    this.editorTypes.push(options);
  }

  findBestImplementation(
    editors: CodeEditor.IEditor[]
  ): IVirtualEditorType<any> {
    // for now, we check if all editors are of the same type,
    // but it could be good enough if majority of the editors
    // had the requested type
    for (let editorType of this.editorTypes) {
      if (editors.every(editor => editor instanceof editorType.supports)) {
        return editorType;
      }
    }
    console.warn(
      `Cold not find a VirtualEditor suitable for the provided set of editors: ${editors}`
    );
    return null;
  }
}

export const VIRTUAL_EDITOR_MANAGER: JupyterFrontEndPlugin<ILSPVirtualEditorManager> = {
  id: PLUGIN_ID + ':ILSPVirtualEditorManager',
  requires: [],
  activate: app => {
    return new VirtualEditorManager();
  },
  provides: ILSPVirtualEditorManager,
  autoStart: true
};
