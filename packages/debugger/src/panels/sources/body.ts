// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type {
  CodeEditorWrapper,
  IEditorServices
} from '@jupyterlab/codeeditor';

import { Signal } from '@lumino/signaling';

import { PanelLayout, Widget } from '@lumino/widgets';

import { Debugger } from '../..';

import { EditorHandler } from '../../handlers/editor';

import type { IDebugger } from '../../tokens';

import type { CodeMirrorEditor } from '@jupyterlab/codemirror';
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

    const factory = new Debugger.ReadOnlyEditorFactory({
      editorServices: options.editorServices
    });

    this._editor = factory.createNewEditor({
      content: '',
      mimeType: '',
      path: ''
    });

    this._editor.hide();

    void this._showSource();

    this._model.currentSourceChanged.connect(this._showSource.bind(this));

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
    this._editor.hide();
  }

  /**
   * Show the content of the current source.
   */
  private async _showSource(): Promise<void> {
    const source = this._model.currentSource;

    if (!source || !source?.content) {
      this._clearEditor();
      return;
    }

    if (this._editorHandler) {
      this._editorHandler.dispose();
    }
    const { content, mimeType } = source;

    this._editor.model.sharedModel.setSource(content);
    this._editor.model.mimeType = mimeType ?? 'text/plain';

    this._editorHandler = new EditorHandler({
      debuggerService: this._debuggerService,
      editorReady: () => Promise.resolve(this._editor.editor),
      getEditor: () => this._editor.editor,
      path: this._model.currentFrame?.source?.path ?? '',
      src: this._editor.model.sharedModel
    });

    requestAnimationFrame(() => {
      const frame = this._model.currentFrame;
      const editor = this._editor.editor;

      if (!frame || !editor) {
        return;
      }

      const doc = (editor as CodeMirrorEditor).doc;
      const lineCount = doc.lines;

      if (frame.line < 1 || frame.line > lineCount) {
        // Line is not in the document
        return;
      }

      EditorHandler.showCurrentLine(editor, frame.line, 'start');
    });

    this._editor.show();
  }

  private _model: IDebugger.Model.ISources;
  private _editor: CodeEditorWrapper;
  private _editorHandler: EditorHandler;
  private _debuggerService: IDebugger;
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
  }
}
