// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { CodeEditor } from '@jupyterlab/codeeditor';

import type { CodeMirrorEditor } from '@jupyterlab/codemirror';

import { ActivityMonitor } from '@jupyterlab/coreutils';

import type { IDisposable } from '@lumino/disposable';

import { Signal } from '@lumino/signaling';

import type { ISharedText, SourceChange } from '@jupyter/ydoc';

import type { Line, Range, StateEffectType } from '@codemirror/state';
import {
  Compartment,
  Prec,
  RangeSet,
  StateEffect,
  StateField
} from '@codemirror/state';

import type { DecorationSet } from '@codemirror/view';
import { Decoration, EditorView, gutter, GutterMarker } from '@codemirror/view';

import type { IDebugger } from '../tokens';
import {
  breakpointIcon,
  selectedBreakpointIcon
} from '@jupyterlab/ui-components';

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
    this._selectedBreakpoint =
      this._debuggerService.model.breakpoints.selectedBreakpoint;
    this._debuggerService.model.breakpoints.changed.connect(async () => {
      const editor = this.editor;
      if (!editor || editor.isDisposed) {
        return;
      }
      this._addBreakpointsToEditor();
    }, this);

    this._debuggerService.model.breakpoints.restored.connect(async () => {
      const editor = this.editor;
      if (!editor || editor.isDisposed) {
        return;
      }
      this._addBreakpointsToEditor();
    }, this);

    this._debuggerService.model.breakpoints.selectedChanged.connect(
      (_, breakpoint) => {
        this._selectedBreakpoint = breakpoint;
        this._addBreakpointsToEditor();
      },
      this
    );

    this._debuggerService.model.callstack.currentFrameChanged.connect(
      (_, frame: IDebugger.IStackFrame) => {
        const editor = this.editor;
        if (editor) {
          EditorHandler.clearHighlight(editor);
          const framePath = frame?.source?.path ?? '';
          const editorPath =
            this._path ||
            this._debuggerService.getCodeId(this._src.getSource());

          // If the current frame belongs to this editor, highlight its line.
          if (framePath && editorPath && framePath === editorPath) {
            if (typeof frame?.line === 'number') {
              EditorHandler.showCurrentLine(editor, frame.line);
            }
          }
        }
      },
      this
    );

    this._breakpointEffect = StateEffect.define<
      { pos: number; selected: boolean }[]
    >({
      map: (value, mapping) =>
        value.map(v => ({
          pos: mapping.mapPos(v.pos),
          selected: v.selected
        }))
    });

    this._breakpointState = StateField.define<RangeSet<GutterMarker>>({
      create: () => {
        return RangeSet.empty;
      },
      update: (breakpoints, transaction) => {
        let hasEffect = false;
        let decorations: Range<GutterMarker> | readonly Range<GutterMarker>[] =
          [];

        for (let ef of transaction.effects) {
          if (ef.is(this._breakpointEffect)) {
            hasEffect = true;
            decorations = ef.value.map(({ pos, selected }) => {
              const marker = selected
                ? Private.selectedBreakpointMarker
                : Private.breakpointMarker;
              return marker.range(pos);
            });
          }
        }

        if (hasEffect) {
          return RangeSet.of(decorations, true);
        }

        return breakpoints.map(transaction.changes);
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
  private _getEffectiveClickedLine(
    editor: EditorView,
    position: number
  ): [Line | undefined, boolean] {
    let clickedLine = editor.state.doc.lineAt(position);
    let clickedLineNumber = clickedLine.number;
    let targetLine: Line | undefined = undefined;
    let isLineEmpty: boolean = false; /* is true is the clicked line of code is empty */
    if (clickedLine.text.trim() === '') {
      isLineEmpty = true;
      while (clickedLineNumber > 1) {
        clickedLineNumber--;
        const prevLine = editor.state.doc.line(clickedLineNumber);
        if (prevLine.text.trim() !== '') {
          targetLine = prevLine;
          break;
        }
      }
    } else {
      if (isLineEmpty === false) {
        targetLine = clickedLine;
      }
    }
    return [targetLine, isLineEmpty];
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

    const [clickedLine, isLineEmpty] = this._getEffectiveClickedLine(
      editor,
      position
    );
    let breakpoints: IDebugger.IBreakpoint[] = this._getBreakpoints();
    let stateBreakpoints = editor.state.field(this._breakpointState);
    let hasBreakpoint = false;

    if (clickedLine) {
      stateBreakpoints.between(clickedLine?.from, clickedLine?.from, () => {
        hasBreakpoint = true;
      });

      if (!hasBreakpoint) {
        /* if there is no breakpoint at effective clickedLine : add one */
        this._debuggerService.model.breakpoints.selectedBreakpoint = null;
        const newBreakpoint = Private.createBreakpoint(
          this._path ?? this._debuggerService.session.connection.name,
          clickedLine.number
        );

        breakpoints.push(newBreakpoint);
      } else {
        /* if there is already a breakpoint */
        if (!isLineEmpty) {
          /* remove the in place breakpoint if the clicked line of code is not empty*/
          breakpoints = breakpoints.filter(
            ele => ele.line !== clickedLine.number
          );

          if (this._selectedBreakpoint) {
            /* if the breakpoint is a selected one: remove it*/
            breakpoints = breakpoints.filter(
              ele => ele.line !== this._selectedBreakpoint?.line
            );
          }
        } else {
          /* if the clicked line of code is empty, find the breakpoint at the effective clicked line
          and make it the selected breakpoint*/
          const breakPointAtClickedLine = breakpoints.find(
            b => b.line === clickedLine.number
          );
          if (breakPointAtClickedLine) {
            this._debuggerService.model.breakpoints.selectedBreakpoint =
              breakPointAtClickedLine;
          }
        }
      }
    }

    breakpoints.sort((a, b) => a.line! - b.line!);

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
    if (
      !this.editor ||
      this._id !== this._debuggerService.session?.connection?.id
    ) {
      return;
    }

    const editor = this.editor as CodeMirrorEditor;
    const breakpoints = this._getBreakpoints();

    this._clearGutter(editor);

    const selectedLine = this._selectedBreakpoint?.line;
    const selectedPath = this._selectedBreakpoint?.source?.path;
    const breakpointData = breakpoints.map(b => {
      const pos = editor.state.doc.line(b.line!).from;
      const selected =
        b.line! === selectedLine && b.source?.path === selectedPath;
      return { pos, selected };
    });

    editor.editor.dispatch({
      effects: this._breakpointEffect.of(breakpointData)
    });
  }

  /**
   * Retrieve the breakpoints from the editor.
   */
  private _getBreakpointsFromEditor(): number[] {
    if (!this.editor) {
      return [];
    }

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
      effects: this._breakpointEffect.of([])
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
  private _breakpointEffect: StateEffectType<
    { pos: number; selected: boolean }[]
  >;
  private _breakpointState: StateField<RangeSet<GutterMarker>>;
  private _gutter: Compartment;
  private _highlightDeco: Decoration;
  private _highlightState: StateField<DecorationSet>;
  private _editorMonitor: ActivityMonitor<ISharedText, SourceChange>;
  private _path: string;
  private _src: ISharedText;
  private _selectedBreakpoint: IDebugger.IBreakpoint | null;
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
   * @param scrollLogicalPosition the position of the the widget after scroll, or false
   * if no scroll is expected.
   */
  export function showCurrentLine(
    editor: CodeEditor.IEditor,
    line: number,
    scrollLogicalPosition: ScrollLogicalPosition | false = 'nearest'
  ): void {
    clearHighlight(editor);
    const cmEditor = editor as CodeMirrorEditor;
    const linePos = cmEditor.doc.line(line).from;

    const effects: StateEffect<any>[] = [
      _highlightEffect.of({ pos: [linePos] })
    ];

    if (scrollLogicalPosition) {
      // getOffsetAt increases the line number before scrolling to it, because
      // Jupyter uses 0-indexes line number while CM6 uses 1-indexes line number.
      // In this case, the line number is 1-indexes as it comes from the debugProtocol
      // stackFrame https://microsoft.github.io/debug-adapter-protocol/specification#Types_StackFrame,
      // therefore we need to decrease it first.
      const offset = cmEditor.getOffsetAt({ line: line - 1, column: 0 });
      effects.push(
        EditorView.scrollIntoView(offset, { y: scrollLogicalPosition })
      );
    }
    cmEditor.editor.dispatch({
      effects: effects
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
    toDOM(view: EditorView) {
      const marker = document.createElement('span');
      marker.className = 'cm-breakpoint-gutter';
      marker.ariaLabel = view.state.phrase('Breakpoint');

      const iconNode = breakpointIcon.element({
        tag: 'span',
        className: 'cm-breakpoint-icon'
      });

      marker.appendChild(iconNode);
      return marker;
    }
  })();

  export const selectedBreakpointMarker = new (class extends GutterMarker {
    toDOM(view: EditorView) {
      const marker = document.createElement('span');
      marker.className = 'cm-breakpoint-gutter';
      marker.ariaLabel = view.state.phrase('Selected breakpoint');
      const iconNode = selectedBreakpointIcon.element({
        tag: 'span',
        className: 'cm-selected-breakpoint-icon'
      });

      marker.appendChild(iconNode);
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
