// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';

import { CodeMirrorEditor } from '@jupyterlab/codemirror';

import { ActivityMonitor } from '@jupyterlab/coreutils';

import { IDisposable } from '@lumino/disposable';

import { Signal } from '@lumino/signaling';

import { ISharedText, SourceChange } from '@jupyter/ydoc';

import {
  Compartment,
  Prec,
  RangeSet,
  StateEffect,
  StateEffectType,
  StateField
} from '@codemirror/state';

import {
  Decoration,
  DecorationSet,
  EditorView,
  gutter,
  GutterMarker
} from '@codemirror/view';

import { IDebugger } from '../tokens';

/**
 * The class name added to the current line.
 */
const LINE_HIGHLIGHT_CLASS = 'jp-DebuggerEditor-highlight';

/**
 * The timeout for listening to editor content changes.
 */
const EDITOR_CHANGED_TIMEOUT = 1000;

/**
 * A handler for a CodeEditor.IEditor.
 */
export class EditorHandler implements IDisposable {
  /**
   * Instantiate a new EditorHandler.
   *
   * @param options The instantiation options for a EditorHandler.
   */
  constructor(options: EditorHandler.IOptions) {
    this._src = options.src;
    this._id = options.debuggerService.session?.connection?.id ?? '';
    this._path = options.path ?? '';
    this._debuggerService = options.debuggerService;
    this._editor = options.getEditor;

    this._editorMonitor = new ActivityMonitor({
      signal: this._src.changed,
      timeout: EDITOR_CHANGED_TIMEOUT
    });
    this._editorMonitor.activityStopped.connect(() => {
      this._sendEditorBreakpoints();
    }, this);

    this._debuggerService.model.breakpoints.changed.connect(async () => {
      const editor = this.editor;
      if (!editor || editor.isDisposed) {
        return;
      }
      this._addBreakpointsToEditor();
    });

    this._debuggerService.model.breakpoints.restored.connect(async () => {
      const editor = this.editor;
      if (!editor || editor.isDisposed) {
        return;
      }
      this._addBreakpointsToEditor();
    });

    this._debuggerService.model.callstack.currentFrameChanged.connect(() => {
      const editor = this.editor;
      if (editor) {
        EditorHandler.clearHighlight(editor);
      }
    });

    this._breakpointEffect = StateEffect.define<{ pos: number[] }>({
      map: (value, mapping) => ({ pos: value.pos.map(v => mapping.mapPos(v)) })
    });

    this._breakpointState = StateField.define<RangeSet<GutterMarker>>({
      create: () => {
        return RangeSet.empty;
      },
      update: (breakpoints, transaction) => {
        breakpoints = breakpoints.map(transaction.changes);
        for (let ef of transaction.effects) {
          if (ef.is(this._breakpointEffect)) {
            let e = ef as StateEffect<{ pos: number[] }>;
            if (e.value.pos.length) {
              breakpoints = breakpoints.update({
                add: e.value.pos.map(v => Private.breakpointMarker.range(v)),
                sort: true
              });
            } else {
              breakpoints = RangeSet.empty;
            }
          }
        }
        return breakpoints;
      }
    });

    this._gutter = new Compartment();

    this._highlightDeco = Decoration.line({ class: LINE_HIGHLIGHT_CLASS });

    this._highlightState = StateField.define<DecorationSet>({
      create: () => {
        return Decoration.none;
      },
      update: (highlights, transaction) => {
        highlights = highlights.map(transaction.changes);
        for (let ef of transaction.effects) {
          if (ef.is(EditorHandler._highlightEffect)) {
            let e = ef as StateEffect<{ pos: number[] }>;
            if (e.value.pos.length) {
              highlights = highlights.update({
                add: e.value.pos.map(v => this._highlightDeco.range(v))
              });
            } else {
              highlights = Decoration.none;
            }
          }
        }
        return highlights;
      },
      provide: f => EditorView.decorations.from(f)
    });

    void options.editorReady().then(() => {
      this._setupEditor();
    });
  }

  /**
   * The editor
   */
  get editor(): CodeEditor.IEditor | null {
    return this._editor();
  }

  /**
   * Whether the handler is disposed.
   */
  isDisposed: boolean;

  /**
   * Dispose the handler.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._editorMonitor.dispose();
    this._clearEditor();
    this.isDisposed = true;
    Signal.clearData(this);
  }

  /**
   * Refresh the breakpoints display
   */
  refreshBreakpoints(): void {
    this._addBreakpointsToEditor();
  }

  /**
   * Setup the editor.
   */
  private _setupEditor(): void {
    const editor = this.editor;
    if (!editor || editor.isDisposed) {
      return;
    }

    editor.setOption('lineNumbers', true);
    const breakpointGutter = [
      this._breakpointState,
      this._highlightState,
      Prec.highest(
        gutter({
          class: 'cm-breakpoint-gutter',
          renderEmptyElements: true,
          markers: v => v.state.field(this._breakpointState),
          initialSpacer: () => Private.breakpointMarker,
          domEventHandlers: {
            mousedown: (view, line): boolean => {
              this._onGutterClick(view, line.from);
              return true;
            }
          }
        })
      )
    ];
    editor.injectExtension(this._gutter.of(breakpointGutter));

    this._addBreakpointsToEditor();
  }

  /**
   * Clear the editor by removing visual elements and handlers.
   */
  private _clearEditor(): void {
    const editor = this.editor as CodeMirrorEditor | null;
    if (!editor || editor.isDisposed) {
      return;
    }

    EditorHandler.clearHighlight(editor);
    this._clearGutter(editor);
    editor.setOption('lineNumbers', false);
    editor.editor.dispatch({
      effects: this._gutter.reconfigure([])
    });
  }

  /**
   * Send the breakpoints from the editor UI via the debug service.
   */
  private _sendEditorBreakpoints(): void {
    if (this.editor?.isDisposed) {
      return;
    }

    const breakpoints = this._getBreakpointsFromEditor().map(lineNumber => {
      return Private.createBreakpoint(
        this._debuggerService.session?.connection?.name || '',
        lineNumber
      );
    });

    void this._debuggerService.updateBreakpoints(
      this._src.getSource(),
      breakpoints,
      this._path
    );
  }

  /**
   * Handle a click on the gutter.
   *
   * @param editor The editor from where the click originated.
   * @param position The position corresponding to the click event.
   */
  private _onGutterClick(editor: EditorView, position: number): void {
    if (this._id !== this._debuggerService.session?.connection?.id) {
      return;
    }

    const lineNumber = editor.state.doc.lineAt(position).number;
    let stateBreakpoints = editor.state.field(this._breakpointState);
    let hasBreakpoint = false;
    stateBreakpoints.between(position, position, () => {
      hasBreakpoint = true;
    });
    let breakpoints: IDebugger.IBreakpoint[] = this._getBreakpoints();
    if (hasBreakpoint) {
      breakpoints = breakpoints.filter(ele => ele.line !== lineNumber);
    } else {
      breakpoints.push(
        Private.createBreakpoint(
          this._path ?? this._debuggerService.session.connection.name,
          lineNumber
        )
      );
    }

    breakpoints.sort((a, b) => {
      return a.line! - b.line!;
    });

    void this._debuggerService.updateBreakpoints(
      this._src.getSource(),
      breakpoints,
      this._path
    );
  }

  /**
   * Add the breakpoints to the editor.
   */
  private _addBreakpointsToEditor(): void {
    if (this._id !== this._debuggerService.session?.connection?.id) {
      return;
    }

    const editor = this.editor as CodeMirrorEditor;
    const breakpoints = this._getBreakpoints();

    this._clearGutter(editor);
    const breakpointPos = breakpoints.map(b => {
      return editor.state.doc.line(b.line!).from;
    });

    editor.editor.dispatch({
      effects: this._breakpointEffect.of({ pos: breakpointPos })
    });
  }

  /**
   * Retrieve the breakpoints from the editor.
   */
  private _getBreakpointsFromEditor(): number[] {
    const editor = this.editor as CodeMirrorEditor;
    const breakpoints = editor.editor.state.field(this._breakpointState);
    let lines: number[] = [];
    breakpoints.between(0, editor.doc.length, (from: number) => {
      lines.push(editor.doc.lineAt(from).number);
    });

    return lines;
  }

  private _clearGutter(editor: CodeEditor.IEditor): void {
    if (!editor) {
      return;
    }

    const view = (editor as CodeMirrorEditor).editor;
    view.dispatch({
      effects: this._breakpointEffect.of({ pos: [] })
    });
  }

  /**
   * Get the breakpoints for the editor using its content (code),
   * or its path (if it exists).
   */
  private _getBreakpoints(): IDebugger.IBreakpoint[] {
    const code = this._src.getSource();
    return this._debuggerService.model.breakpoints.getBreakpoints(
      this._path || this._debuggerService.getCodeId(code)
    );
  }

  private _id: string;
  private _debuggerService: IDebugger;
  private _editor: () => CodeEditor.IEditor | null;
  private _breakpointEffect: StateEffectType<{ pos: number[] }>;
  private _breakpointState: StateField<RangeSet<GutterMarker>>;
  private _gutter: Compartment;
  private _highlightDeco: Decoration;
  private _highlightState: StateField<DecorationSet>;
  private _editorMonitor: ActivityMonitor<ISharedText, SourceChange>;
  private _path: string;
  private _src: ISharedText;
}

/**
 * A namespace for EditorHandler `statics`.
 */
export namespace EditorHandler {
  /**
   * Instantiation options for `EditorHandler`.
   */
  export interface IOptions {
    /**
     * The debugger service.
     */
    debuggerService: IDebugger;

    /**
     * Promise resolving when the editor is ready.
     */
    editorReady(): Promise<CodeEditor.IEditor>;

    /**
     * Get the code editor to handle.
     */
    getEditor(): CodeEditor.IEditor | null;

    /**
     * An optional path to a source file.
     */
    path?: string;

    /**
     * The code source to debug
     */
    src: ISharedText;
  }

  export const _highlightEffect = StateEffect.define<{ pos: number[] }>({
    map: (value, mapping) => ({ pos: value.pos.map(v => mapping.mapPos(v)) })
  });

  /**
   * Highlight the current line of the frame in the given editor.
   *
   * @param editor The editor to highlight.
   * @param line The line number.
   */
  export function showCurrentLine(
    editor: CodeEditor.IEditor,
    line: number
  ): void {
    clearHighlight(editor);
    const cmEditor = editor as CodeMirrorEditor;
    const linePos = cmEditor.doc.line(line).from;
    cmEditor.editor.dispatch({
      effects: _highlightEffect.of({ pos: [linePos] })
    });
  }

  /**
   * Remove all line highlighting indicators for the given editor.
   *
   * @param editor The editor to cleanup.
   */
  export function clearHighlight(editor: CodeEditor.IEditor): void {
    if (!editor || editor.isDisposed) {
      return;
    }
    const cmEditor = editor as CodeMirrorEditor;
    cmEditor.editor.dispatch({
      effects: _highlightEffect.of({ pos: [] })
    });
  }
}

/**
 * A namespace for module private data.
 */
namespace Private {
  /**
   * Create a marker DOM element for a breakpoint.
   */
  export const breakpointMarker = new (class extends GutterMarker {
    toDOM() {
      const marker = document.createTextNode('●');
      return marker;
    }
  })();

  /**
   * Create a new breakpoint.
   *
   * @param session The name of the session.
   * @param line The line number of the breakpoint.
   */
  export function createBreakpoint(
    session: string,
    line: number
  ): IDebugger.IBreakpoint {
    return {
      line,
      verified: true,
      source: {
        name: session
      }
    };
  }
}
