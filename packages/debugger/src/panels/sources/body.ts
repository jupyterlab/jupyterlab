// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CodeEditorWrapper,
  IEditorMimeTypeService,
  IEditorServices
} from '@jupyterlab/codeeditor';

import { Signal } from '@lumino/signaling';

import { PanelLayout, Widget } from '@lumino/widgets';

import { Debugger } from '../..';

import { EditorHandler } from '../../handlers/editor';

import { IDebugger } from '../../tokens';
import { ICodeCellModel } from '@jupyterlab/cells';
import { INotebookTracker } from '@jupyterlab/notebook';

/**
 * The body for a Sources Panel.
 */
export class SourcesBody extends Widget {
  /**
   * Instantiate a new Body for the SourcesBody widget.
   *
   * @param options The instantiation options for a SourcesBody.
   */
  constructor(options: SourcesBody.IOptions) {
    super();
    this._model = options.model;
    this._debuggerService = options.service;
    this._mimeTypeService = options.editorServices.mimeTypeService;
    this._notebookTracker = options.notebookTracker ?? undefined;

    const factory = new Debugger.ReadOnlyEditorFactory({
      editorServices: options.editorServices
    });

    this._editor = factory.createNewEditor({
      content: '',
      mimeType: '',
      path: ''
    });
    this._editor.hide();

    this._model.currentFrameChanged.connect(async (_, frame) => {
      if (!frame) {
        this._clearEditor();
        return;
      }

      void this._showSource(frame, this._notebookTracker);
    });

    const layout = new PanelLayout();
    layout.addWidget(this._editor);
    this.layout = layout;

    this.addClass('jp-DebuggerSources-body');
  }

  /**
   * Dispose the sources body widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._editorHandler?.dispose();
    Signal.clearData(this);
    super.dispose();
  }

  /**
   * Clear the content of the source read-only editor.
   */
  private _clearEditor(): void {
    this._model.currentSource = null;
    this._editor.hide();
  }

  /**
   * Show the content of the source for the given frame.
   *
   * @param frame The current frame.
   * @param notebookTracker The notebook tracker.
   */
  private async _showSource(
    frame: IDebugger.IStackFrame,
    notebookTracker: INotebookTracker | undefined
  ): Promise<void> {
    let displayPath = frame.source?.path ?? '';

    console.log(notebookTracker);

    if (notebookTracker && frame.source?.path) {
      notebookTracker.forEach(panel => {
        const kernelName = panel.sessionContext.session?.kernel?.name ?? '';
        panel.content.widgets.forEach(cell => {
          if (cell.model.type !== 'code') return;

          const code = cell.model.sharedModel.getSource();
          const codeId = this._debuggerService.config.getCodeId(
            code,
            kernelName
          );

          if (codeId === frame.source?.path) {
            const codeCell = cell.model as ICodeCellModel;
            if (codeCell.executionState === 'running') {
              displayPath = `Cell [*]`;
            } else if (codeCell.executionCount === null) {
              displayPath = `Cell [ ]`;
            } else {
              displayPath = `Cell [${codeCell.executionCount}]`;
            }
          }
        });
      });
    }

    const source = await this._debuggerService.getSource({
      sourceReference: 0,
      path: frame.source?.path
    });

    if (!source?.content) {
      this._clearEditor();
      return;
    }

    if (this._editorHandler) {
      this._editorHandler.dispose();
    }

    const { content, mimeType } = source;
    const editorMimeType =
      mimeType ||
      this._mimeTypeService.getMimeTypeByFilePath(frame.source?.path ?? '');

    this._editor.model.sharedModel.setSource(content);
    this._editor.model.mimeType = editorMimeType;

    this._editorHandler = new EditorHandler({
      debuggerService: this._debuggerService,
      editorReady: () => Promise.resolve(this._editor.editor),
      getEditor: () => this._editor.editor,
      path: displayPath,
      src: this._editor.model.sharedModel
    });

    this._model.currentSource = {
      content,
      mimeType: editorMimeType,
      path: displayPath
    };

    requestAnimationFrame(() => {
      EditorHandler.showCurrentLine(this._editor.editor, frame.line);
    });

    this._editor.show();
  }

  private _model: IDebugger.Model.ISources;
  private _editor: CodeEditorWrapper;
  private _editorHandler: EditorHandler;
  private _debuggerService: IDebugger;
  private _mimeTypeService: IEditorMimeTypeService;
  private _notebookTracker: INotebookTracker | undefined;
}

/**
 * A namespace for SourcesBody `statics`.
 */
export namespace SourcesBody {
  /**
   * Instantiation options for `Breakpoints`.
   */
  export interface IOptions {
    /**
     * The debug service.
     */
    service: IDebugger;

    /**
     * The sources model.
     */
    model: IDebugger.Model.ISources;

    /**
     * The editor services used to create new read-only editors.
     */
    editorServices: IEditorServices;

    /**
     * The notebook tracker.
     */
    notebookTracker?: INotebookTracker | null;
  }
}
