// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';

import { CodeMirrorEditor } from '@jupyterlab/codemirror';

import { ActivityMonitor } from '@jupyterlab/coreutils';

import { IObservableString } from '@jupyterlab/observables';

import { IDisposable } from '@phosphor/disposable';

import { Signal } from '@phosphor/signaling';

import { Editor } from 'codemirror';

import { Breakpoints } from '../breakpoints';

import { Callstack } from '../callstack';

import { Debugger } from '../debugger';

import { IDebugger } from '../tokens';

const LINE_HIGHLIGHT_CLASS = 'jp-breakpoint-line-highlight';

const EDITOR_CHANGED_TIMEOUT = 1000;

export class EditorHandler implements IDisposable {
  constructor(options: EditorHandler.IOptions) {
    this._id = options.debuggerService.session.client.path;
    this._debuggerService = options.debuggerService;
    this.onModelChanged();
    this._debuggerService.modelChanged.connect(() => this.onModelChanged());
    this._editor = options.editor;

    this._editorMonitor = new ActivityMonitor({
      signal: this._editor.model.value.changed,
      timeout: EDITOR_CHANGED_TIMEOUT
    });

    this._editorMonitor.activityStopped.connect(() => {
      this.sendEditorBreakpoints();
    }, this);

    this.setup();
  }

  isDisposed: boolean;

  private onModelChanged() {
    this._debuggerModel = this._debuggerService.model as Debugger.Model;
    if (!this._debuggerModel) {
      return;
    }
    this.breakpointsModel = this._debuggerModel.breakpointsModel;

    this._debuggerModel.callstackModel.currentFrameChanged.connect(() => {
      EditorHandler.clearHighlight(this._editor);
    });

    this.breakpointsModel.changed.connect(async () => {
      if (!this._editor || this._editor.isDisposed) {
        return;
      }
      this.addBreakpointsToEditor();
    });

    this.breakpointsModel.restored.connect(async () => {
      if (!this._editor || this._editor.isDisposed) {
        return;
      }
      this.addBreakpointsToEditor();
    });
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._editorMonitor.dispose();
    this.removeGutterClick();
    Signal.clearData(this);
    this.isDisposed = true;
  }

  protected sendEditorBreakpoints() {
    if (this._editor.isDisposed) {
      return;
    }

    const breakpoints = this.getBreakpointsFromEditor().map(lineInfo => {
      return Private.createBreakpoint(
        this._debuggerService.session.client.name,
        this.getEditorId(),
        lineInfo.line + 1
      );
    });

    void this._debuggerService.updateBreakpoints(
      this._editor.model.value.text,
      breakpoints
    );
  }

  protected setup() {
    if (!this._editor || this._editor.isDisposed) {
      return;
    }

    this.addBreakpointsToEditor();

    const editor = this._editor as CodeMirrorEditor;
    editor.setOption('lineNumbers', true);
    editor.editor.setOption('gutters', [
      'CodeMirror-linenumbers',
      'breakpoints'
    ]);

    editor.editor.on('gutterClick', this.onGutterClick);
  }

  protected removeGutterClick() {
    if (!this._editor || this._editor.isDisposed) {
      return;
    }
    const editor = this._editor as CodeMirrorEditor;
    editor.editor.off('gutterClick', this.onGutterClick);
  }

  protected getEditorId(): string {
    return this._editor.uuid;
  }

  protected onGutterClick = (editor: Editor, lineNumber: number) => {
    const info = editor.lineInfo(lineNumber);

    if (!info || this._id !== this._debuggerService.session.client.path) {
      return;
    }

    editor.focus();
    const isRemoveGutter = !!info.gutterMarkers;
    let breakpoints: IDebugger.IBreakpoint[] = this.getBreakpoints();
    if (isRemoveGutter) {
      breakpoints = breakpoints.filter(ele => ele.line !== info.line + 1);
    } else {
      breakpoints.push(
        Private.createBreakpoint(
          this._debuggerService.session.client.name,
          this.getEditorId(),
          info.line + 1
        )
      );
    }

    void this._debuggerService.updateBreakpoints(
      this._editor.model.value.text,
      breakpoints
    );
  };

  private addBreakpointsToEditor() {
    const editor = this._editor as CodeMirrorEditor;
    const breakpoints = this.getBreakpoints();
    if (this._id !== this._debuggerService.session.client.path) {
      return;
    }
    EditorHandler.clearGutter(editor);
    breakpoints.forEach(breakpoint => {
      editor.editor.setGutterMarker(
        breakpoint.line - 1,
        'breakpoints',
        Private.createMarkerNode()
      );
    });
  }

  private getBreakpointsFromEditor(): ILineInfo[] {
    const editor = this._editor as CodeMirrorEditor;
    let lines = [];
    for (let i = 0; i < editor.doc.lineCount(); i++) {
      const info = editor.editor.lineInfo(i);
      if (info.gutterMarkers) {
        lines.push(info);
      }
    }
    return lines;
  }

  private getBreakpoints(): IDebugger.IBreakpoint[] {
    const code = this._editor.model.value.text;
    return this._debuggerModel.breakpointsModel.getBreakpoints(
      this._debuggerService.getCodeId(code)
    );
  }

  private _editor: CodeEditor.IEditor;
  private _debuggerModel: Debugger.Model;
  private breakpointsModel: Breakpoints.Model;
  private _debuggerService: IDebugger;
  private _id: string;
  private _editorMonitor: ActivityMonitor<
    IObservableString,
    IObservableString.IChangedArgs
  > = null;
}

export namespace EditorHandler {
  export interface IOptions {
    debuggerModel: Debugger.Model;
    debuggerService: IDebugger;
    editor: CodeEditor.IEditor;
  }

  /**
   * Highlight the current line of the frame in the given editor.
   * @param editor The editor to highlight.
   * @param frame The frame with the current line number.
   */
  export function showCurrentLine(
    editor: CodeEditor.IEditor,
    frame: Callstack.IFrame
  ) {
    clearHighlight(editor);
    const cmEditor = editor as CodeMirrorEditor;
    cmEditor.editor.addLineClass(frame.line - 1, 'wrap', LINE_HIGHLIGHT_CLASS);
  }

  /**
   * Remove all line highlighting indicators for the given editor.
   * @param editor The editor to cleanup.
   */
  export function clearHighlight(editor: CodeEditor.IEditor) {
    if (!editor || editor.isDisposed) {
      return;
    }
    const cmEditor = editor as CodeMirrorEditor;
    cmEditor.doc.eachLine(line => {
      cmEditor.editor.removeLineClass(line, 'wrap', LINE_HIGHLIGHT_CLASS);
    });
  }

  /**
   * Remove line numbers and all gutters from editor.
   * @param editor The editor to cleanup.
   */

  export function clearGutter(editor: CodeEditor.IEditor) {
    if (!editor) {
      return;
    }
    const cmEditor = editor as CodeMirrorEditor;
    cmEditor.doc.eachLine(line => {
      if ((line as ILineInfo).gutterMarkers) {
        cmEditor.editor.setGutterMarker(line, 'breakpoints', null);
      }
    });
  }
}

export interface ILineInfo {
  line: any;
  handle: any;
  text: string;
  /** Object mapping gutter IDs to marker elements. */
  gutterMarkers: any;
  textClass: string;
  bgClass: string;
  wrapClass: string;
  /** Array of line widgets attached to this line. */
  widgets: any;
}

namespace Private {
  export function createMarkerNode() {
    let marker = document.createElement('div');
    marker.className = 'jp-breakpoint-marker';
    marker.innerHTML = '●';
    return marker;
  }
  export function createBreakpoint(
    session: string,
    type: string,
    line: number
  ) {
    return {
      line,
      active: true,
      verified: true,
      source: {
        name: session
      }
    };
  }
}
