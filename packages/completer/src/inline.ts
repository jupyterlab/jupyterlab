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
import { SourceChange } from '@jupyter/ydoc';

import {
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType
} from '@codemirror/view';
import { StateEffect, StateField, Text, Transaction } from '@codemirror/state';
import { IInlineCompletionList } from './tokens';
import { Toolbar } from '@jupyterlab/ui-components';

const INLINE_COMPLETER_CLASS = 'jp-InlineCompleter';
const TRANSIENT_LINE_SPACER_CLASS = 'jp-GhostText-hiding';
const GHOST_TEXT_CLASS = 'jp-GhostText';

/**
 * Widget allowing user to choose among inline completions,
 * typically by pressing next/previous buttons, and showing
 * additional metadata about active completion, such as
 * inline completion provider name.
 */
export class InlineCompleter extends Widget {
  // TODO maybe create extension point to add custom buttons (per provider?)
  // TODO: accepting via key press

  constructor(options: InlineCompleter.IOptions) {
    super({ node: document.createElement('div') });
    this.model = options.model ?? null;
    this.editor = options.editor ?? null;
    this.addClass(INLINE_COMPLETER_CLASS);
    this._ghostManager = createGhostManager();
    this.node.appendChild(this._suggestionsCounter);
    // TODO: attaching toolbar this does not work great here, using box layout introduces a different problem.
    this.node.appendChild(this.toolbar.node);
  }
  toolbar = new Toolbar<Widget>();
  private _ghostManager: IGhostTextManager;

  private _suggestionsCounter = document.createElement('div');

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
      this._model.suggestionsChanged.disconnect(
        this._onModelSuggestionsChanged,
        this
      );
      this._model.filterTextChanged.disconnect(
        this._onModelFilterTextChanged,
        this
      );
    }
    this._model = model;
    if (this._model) {
      this._model.suggestionsChanged.connect(
        this._onModelSuggestionsChanged,
        this
      );
      this._model.filterTextChanged.connect(
        this._onModelFilterTextChanged,
        this
      );
    }
  }

  cycle(direction: 'next' | 'previous'): void {
    const items = this.model?.completions?.items;
    if (!items) {
      return;
    }
    if (direction === 'next') {
      const proposed = this._current + 1;
      this._current = proposed === items.length ? 0 : proposed;
    } else {
      const proposed = this._current - 1;
      this._current = proposed === -1 ? items.length - 1 : proposed;
    }
    this._render();
  }

  private _onModelSuggestionsChanged(
    _emitter: InlineCompleter.IModel,
    reason: 'set' | 'append'
  ): void {
    if (!this.isAttached) {
      return;
    }
    if (reason == 'set') {
      this._current = 0;
      this.update();
    }
    this._render();
  }

  private _onModelFilterTextChanged(
    _emitter: InlineCompleter.IModel,
    mapping: Map<number, number>
  ): void {
    const completions = this.model?.completions;
    if (!completions) {
      return;
    }
    this._current = mapping.get(this._current) ?? 0;
    this._render();
  }

  private _current: number = 0;

  private _render(): void {
    const completions = this.model?.completions;
    if (!completions) {
      return;
    }
    this._setText(completions.items[this._current]);
    this._suggestionsCounter.innerText =
      this._current + 1 + '/' + completions.items.length;
  }

  private _setText(item: CompletionHandler.IInlineItem) {
    const text = item.insertText;

    const editor = this._editor;
    const model = this._model;
    if (!model || !editor) {
      console.log('bail on set text');
      return;
    }

    const view = (editor as CodeMirrorEditor).editor;
    this._ghostManager.placeGhost(view, {
      from: editor.getOffsetAt(model.cursor),
      content: text
    });
  }

  protected updateVisibility() {
    const model = this._model;
    if (!model) {
      return;
    }
    let reply = model.completions;

    // If there are no items, hide.
    if (!reply || !reply.items) {
      if (!this.isHidden) {
        this.hide();
      }
      return;
    }

    if (this.isHidden) {
      this.show();
    }
  }

  /**
   * Handle `update-request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    this.updateVisibility();
    //this.toolbar.update();
    this._setGeometry();
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
      maxHeight: 40,
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

  updateDOM(dom: HTMLElement, _view: EditorView): boolean {
    dom.innerText = this.content;
    return true;
  }

  toDOM() {
    let wrap = document.createElement('span');
    wrap.classList.add(GHOST_TEXT_CLASS);
    wrap.innerText = this.content;
    return wrap;
  }
}

class TransientLineSpacerWidget extends GhostTextWidget {
  toDOM() {
    const wrap = super.toDOM();
    wrap.classList.add(TRANSIENT_LINE_SPACER_CLASS);
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

enum GhostAction {
  Set,
  Remove,
  FilterAndUpdate
}

interface IGhostActionData {
  /* Action to perform on editor transaction */
  action: GhostAction;
  /* Spec of the ghost text to set on transaction */
  spec?: IGhostText;
}

export function createGhostManager(): IGhostTextManager {
  const addMark = StateEffect.define<IGhostText>({
    map: ({ from, content }, change) => ({
      from: change.mapPos(from),
      to: change.mapPos(from + content.length),
      content
    })
  });

  const removeMark = StateEffect.define<null>();

  /**
   * Decide what should be done for transaction effects.
   */
  function chooseAction(tr: Transaction): IGhostActionData | null {
    // This function can short-circuit because at any time there is no more than one ghost text.
    for (let e of tr.effects) {
      if (e.is(addMark)) {
        return {
          action: GhostAction.Set,
          spec: e.value
        };
      } else if (e.is(removeMark)) {
        return {
          action: GhostAction.Remove
        };
      }
    }
    if (tr.docChanged || tr.selection) {
      return {
        action: GhostAction.FilterAndUpdate
      };
    }
    return null;
  }

  function createWidget(spec: IGhostText, tr: Transaction) {
    const ghost = Decoration.widget({
      widget: new GhostTextWidget(spec.content),
      side: 1,
      ghostSpec: spec
    });
    // Widget decorations can only have zero-length ranges
    return ghost.range(
      Math.min(spec.from, tr.newDoc.length),
      Math.min(spec.from, tr.newDoc.length)
    );
  }

  function createLineSpacer(
    spec: IGhostText,
    tr: Transaction,
    timeout: number = 1000
  ) {
    const timeoutInfo = {
      elapsed: false
    };
    setTimeout(() => {
      timeoutInfo.elapsed = true;
    }, timeout);
    const ghost = Decoration.widget({
      widget: new TransientLineSpacerWidget(spec.content),
      side: 1,
      timeoutInfo
    });
    // Widget decorations can only have zero-length ranges
    return ghost.range(
      Math.min(spec.from, tr.newDoc.length),
      Math.min(spec.from, tr.newDoc.length)
    );
  }

  const markField = StateField.define<DecorationSet>({
    create() {
      return Decoration.none;
    },
    update(marks, tr) {
      const data = chooseAction(tr);
      // remove spacers after timeout
      marks = marks.update({
        filter: (_from, _to, value) => {
          if (value.spec.widget instanceof TransientLineSpacerWidget) {
            return !value.spec.timeoutInfo.elapsed;
          }
          return true;
        }
      });
      if (!data) {
        return marks.map(tr.changes);
      }
      switch (data.action) {
        case GhostAction.Set: {
          const spec = data.spec!;
          const newWidget = createWidget(spec, tr);
          return marks.update({
            add: [newWidget],
            filter: (_from, _to, value) => value === newWidget.value
          });
        }
        case GhostAction.Remove:
          return marks.update({
            filter: () => false
          });
        case GhostAction.FilterAndUpdate: {
          let cursor = marks.iter();
          // skip over spacer if any
          while (
            cursor.value &&
            cursor.value.spec.widget instanceof TransientLineSpacerWidget
          ) {
            cursor.next();
          }
          if (!cursor.value) {
            // short-circuit if no widgets are present, or if only spacer was present
            return marks.map(tr.changes);
          }
          const originalSpec = cursor.value!.spec.ghostSpec as IGhostText;
          const spec = { ...originalSpec };
          let shouldRemoveGhost = false;
          tr.changes.iterChanges(
            (
              fromA: number,
              toA: number,
              fromB: number,
              toB: number,
              inserted: Text
            ) => {
              if (shouldRemoveGhost) {
                return;
              }
              if (fromA === toA && fromB !== toB) {
                // text was inserted without modifying old text
                for (
                  let lineNumber = 0;
                  lineNumber < inserted.lines;
                  lineNumber++
                ) {
                  const lineContent = inserted.lineAt(lineNumber).text;
                  const line =
                    lineNumber > 0 ? '\n' + lineContent : lineContent;
                  if (spec.content.startsWith(line)) {
                    spec.content = spec.content.slice(line.length);
                    spec.from += line.length;
                  } else {
                    shouldRemoveGhost = true;
                    break;
                  }
                }
              } else if (fromB === toB && fromA !== toA) {
                // text was removed
                shouldRemoveGhost = true;
              } else {
                // text was replaced
                shouldRemoveGhost = true;
                // TODO: could check if the previous spec matches
              }
            }
          );
          // removing multi-line widget would cause the code cell to jump; instead
          // we add a temporary spacer widget which will be removed in a future update
          // allowing a slight delay between getting a new suggestion and reducing cell height
          const newWidget = shouldRemoveGhost
            ? createLineSpacer(originalSpec, tr)
            : createWidget(spec, tr);
          marks = marks.update({
            add: [newWidget],
            filter: (_from, _to, value) => value === newWidget.value
          });
          if (shouldRemoveGhost) {
            marks = marks.map(tr.changes);
          }
          return marks;
        }
      }
    },
    provide: f => EditorView.decorations.from(f)
  });

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
     * A signal emitted when new suggestions are set on the model.
     */
    readonly suggestionsChanged: ISignal<IModel, 'set' | 'append'>;

    /**
     * A signal emitted when filter text is updated.
     * Emits a mapping from old to new index for items after filtering.
     */
    readonly filterTextChanged: ISignal<IModel, Map<number, number>>;

    /**
     * Original placement of cursor
     */
    cursor: CodeEditor.IPosition;

    setCompletions(
      reply: IInlineCompletionList<CompletionHandler.IInlineItem>
    ): void;

    appendCompletions(
      reply: IInlineCompletionList<CompletionHandler.IInlineItem>
    ): void;

    completions: IInlineCompletionList<CompletionHandler.IInlineItem> | null;

    handleTextChange(change: SourceChange): void;
  }

  /**
   * Model for inline completions.
   */
  export class Model implements InlineCompleter.IModel {
    setCompletions(
      reply: IInlineCompletionList<CompletionHandler.IInlineItem>
    ) {
      this._completions = reply;
      this.suggestionsChanged.emit('set');
    }

    appendCompletions(
      reply: IInlineCompletionList<CompletionHandler.IInlineItem>
    ) {
      if (!this._completions) {
        console.warn('No completions to append to');
        return;
      }
      this._completions.items.push(...reply.items);
      this.suggestionsChanged.emit('append');
    }

    get cursor(): CodeEditor.IPosition {
      return this._cursor;
    }

    set cursor(value: CodeEditor.IPosition) {
      this._cursor = value;
    }

    get completions() {
      return this._completions;
    }

    /**
     * Get whether the model is disposed.
     */
    get isDisposed(): boolean {
      return this._isDisposed;
    }

    handleTextChange(sourceChange: SourceChange) {
      const completions = this._completions;
      if (!completions) {
        return;
      }
      const originalPositions: Map<CompletionHandler.IInlineItem, number> =
        new Map(completions.items.map((item, index) => [item, index]));
      for (let change of sourceChange.sourceChange ?? []) {
        const insert = change.insert;
        if (insert) {
          const items = completions.items.filter(item => {
            const filterText = item.filterText ?? item.insertText;
            if (!filterText.startsWith(insert)) {
              return false;
            }
            item.filterText = filterText.substring(insert.length);
            item.insertText = item.insertText.substring(insert.length);
            return true;
          });
          if (items.length === 0) {
            // all items from this provider were filtered out
            this._completions = null;
          }
          completions.items = items;
        } else {
          this._completions = null;
        }
      }
      const indexMap = new Map(
        completions.items.map((item, newIndex) => [
          originalPositions.get(item)!,
          newIndex
        ])
      );
      this.filterTextChanged.emit(indexMap);
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

    suggestionsChanged = new Signal<this, 'set' | 'append'>(this);
    filterTextChanged = new Signal<this, Map<number, number>>(this);
    private _isDisposed = false;
    private _completions: IInlineCompletionList<CompletionHandler.IInlineItem> | null =
      null;
    private _cursor: CodeEditor.IPosition;
  }
}
