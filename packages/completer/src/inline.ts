// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';
import { Widget } from '@lumino/widgets';
import { CompletionHandler } from './handler';
import { HoverBox } from '@jupyterlab/ui-components';
import { IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';
import { Message } from '@lumino/messaging';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';

import {
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType
} from '@codemirror/view';
import { StateEffect, StateField } from '@codemirror/state';
/**
 * Widget allowing user to choose among inline completions,
 * typically by pressing next/previous buttons, and showing
 * additional metadata about active completion, such as
 * inline completion provider name.
 */
export class InlineCompleter extends Widget {
  // TODO populate this with next/previous buttons, maybe create extension point to add custom buttons (per provider?)
  // TODO: filtering or rejecting on text change, accepting via key press
  constructor(options: InlineCompleter.IOptions) {
    super({ node: document.createElement('div') });
    this.model = options.model ?? null;
    this.editor = options.editor ?? null;
    this.addClass('jp-InlineCompleter');
    this._ghostManager = createGhostManager();
  }
  private _ghostManager: IGhostTextManager;

  /**
   * The editor used by the completion widget.
   */
  get editor(): CodeEditor.IEditor | null | undefined {
    return this._editor;
  }
  set editor(newValue: CodeEditor.IEditor | null | undefined) {
    this._editor = newValue;
  }

  /**
   * The model used by the completer widget.
   */
  get model(): InlineCompleter.IModel | null {
    return this._model;
  }
  set model(model: InlineCompleter.IModel | null) {
    if ((!model && !this._model) || model === this._model) {
      return;
    }
    if (this._model) {
      this._model.stateChanged.disconnect(this.onModelStateChanged, this);
      //this._model.queryChanged.disconnect(this.onModelQueryChanged, this);
    }
    this._model = model;
    if (this._model) {
      this._model.stateChanged.connect(this.onModelStateChanged, this);
      //this._model.queryChanged.connect(this.onModelQueryChanged, this);
    }
  }

  protected onModelStateChanged(): void {
    if (this.isAttached) {
      this.update();
    }
  }

  private _setText(text: string) {
    const editor = this._editor;
    const model = this._model;
    if (!model || !editor) {
      console.log('bail on set text');
      return;
    }

    const view = (editor as CodeMirrorEditor).editor;
    this._ghostManager.clearGhosts(view);
    this._ghostManager.placeGhost(view, {
      from: editor.getOffsetAt(model.cursor),
      content: text
    });
  }

  /**
   * Handle `update-request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    const model = this._model;
    if (!model) {
      return;
    }
    let reply = model.completionReply();

    // If there are no items, reset and bail.
    if (!reply || !reply.length) {
      if (!this.isHidden) {
        //this.reset();
        this.hide();
        //this._visibilityChanged.emit(undefined);
      }
      return;
    }

    if (this.isHidden) {
      this.show();
      this._setGeometry();
      //this._visibilityChanged.emit(undefined);
    } else {
      this._setGeometry();
    }
    const first = reply[0].completions.items;
    if (first.length) {
      this._setText(first[0].insertText);
    }
  }

  private _setGeometry() {
    const { node } = this;
    const model = this._model;
    const editor = this._editor;

    if (!editor || !model || !model.cursor) {
      return;
    }

    const host =
      (editor.host.closest('.jp-MainAreaWidget > .lm-Widget') as HTMLElement) ||
      editor.host;

    const anchor = editor.getCoordinateForPosition(model.cursor) as DOMRect;
    HoverBox.setGeometry({
      anchor,
      host: host,
      maxHeight: 20,
      minHeight: 20,
      node: node,
      privilege: 'above',
      outOfViewDisplay: {
        top: 'stick-inside',
        bottom: 'stick-inside',
        left: 'stick-inside',
        right: 'stick-outside'
      }
    });
  }
  private _editor: CodeEditor.IEditor | null | undefined = null;
  private _model: InlineCompleter.IModel | null = null;
}

class GhostTextWidget extends WidgetType {
  constructor(readonly content: string) {
    super();
  }

  eq(other: GhostTextWidget) {
    return other.content == this.content;
  }

  get lineBreaks() {
    return (this.content.match(/\n/g) || '').length;
  }

  toDOM() {
    let wrap = document.createElement('span');
    // TODO proper class styling
    wrap.style.whiteSpace = 'pre';
    wrap.style.color = 'grey';
    wrap.innerText = this.content;
    return wrap;
  }
}

/**
 *
 */
export interface IGhostTextManager {
  placeGhost(view: EditorView, text: IGhostText): void;
  clearGhosts(view: EditorView): void;
}

export interface IGhostText {
  from: number;
  content: string;
}

export function createGhostManager(): IGhostTextManager {
  const addMark = StateEffect.define<IGhostText>({
    map: ({ from, content }, change) => ({
      from: change.mapPos(from),
      to: change.mapPos(from + content.length),
      content,
      _isGhostText: true
    })
  });

  const removeMark = StateEffect.define<null>();

  const markField = StateField.define<DecorationSet>({
    create() {
      return Decoration.none;
    },
    update(marks, tr) {
      marks = marks.map(tr.changes);
      for (let e of tr.effects) {
        if (e.is(addMark)) {
          const ghost = Decoration.widget({
            widget: new GhostTextWidget(e.value.content),
            side: 1
          });
          marks = marks.update({
            add: [
              ghost.range(
                Math.min(e.value.from, tr.newDoc.length),
                Math.min(
                  e.value.from + e.value.content.length,
                  tr.newDoc.length
                )
              )
            ]
          });
        } else if (e.is(removeMark)) {
          marks = marks.update({
            filter: (_from, _to, value) => {
              return value.spec._isGhostText;
            }
          });
        }
      }
      return marks;
    },
    provide: f => EditorView.decorations.from(f)
  });

  //const views = new Set<EditorView>();

  return {
    placeGhost(view: EditorView, text: IGhostText) {
      const effects: StateEffect<unknown>[] = [addMark.of(text)];

      if (!view.state.field(markField, false)) {
        effects.push(StateEffect.appendConfig.of([markField]));
        effects.push(
          StateEffect.appendConfig.of([
            EditorView.domEventHandlers({
              blur: () => {
                const effects: StateEffect<unknown>[] = [removeMark.of(null)];
                view.dispatch({ effects });
              }
            })
          ])
        );
      }
      view.dispatch({ effects });
      //views.add(view);
    },
    clearGhosts(view: EditorView) {
      const effects: StateEffect<unknown>[] = [removeMark.of(null)];
      view.dispatch({ effects });
    }
  };
}

export namespace InlineCompleter {
  export interface IOptions {
    /**
     * The semantic parent of the completer widget, its referent editor.
     */
    editor?: CodeEditor.IEditor | null;

    /**
     * The model for the completer widget.
     */
    model?: IModel;
  }

  /**
   * Model for inline completions.
   */
  export interface IModel extends IDisposable {
    /**
     * A signal emitted when state of the completer model changes.
     */
    readonly stateChanged: ISignal<IModel, void>;

    /**
     * Original placement of cursor
     */
    cursor: CodeEditor.IPosition;

    // TODO: not happy with this being named reply
    setCompletionReply(reply: CompletionHandler.IInlineCompletionReply[]): void;

    completionReply(): CompletionHandler.IInlineCompletionReply[];
  }

  /**
   * Model for inline completions.
   */
  export class Model implements InlineCompleter.IModel {
    setCompletionReply(reply: CompletionHandler.IInlineCompletionReply[]) {
      this._reply = reply;
      this.stateChanged.emit();
    }

    get cursor(): CodeEditor.IPosition {
      return this._cursor;
    }

    set cursor(value: CodeEditor.IPosition) {
      this._cursor = value;
    }

    completionReply() {
      return this._reply;
    }

    /**
     * Get whether the model is disposed.
     */
    get isDisposed(): boolean {
      return this._isDisposed;
    }

    /**
     * Dispose of the resources held by the model.
     */
    dispose(): void {
      // Do nothing if already disposed.
      if (this._isDisposed) {
        return;
      }
      this._isDisposed = true;
      Signal.clearData(this);
    }

    stateChanged = new Signal<this, void>(this);
    private _isDisposed = false;
    private _reply: CompletionHandler.IInlineCompletionReply[] = [];
    private _cursor: CodeEditor.IPosition;
  }
}
