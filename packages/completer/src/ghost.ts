// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType
} from '@codemirror/view';
import { StateEffect, StateField, Text, Transaction } from '@codemirror/state';

const TRANSIENT_LINE_SPACER_CLASS = 'jp-GhostText-lineSpacer';
const TRANSIENT_LETTER_SPACER_CLASS = 'jp-GhostText-letterSpacer';
const GHOST_TEXT_CLASS = 'jp-GhostText';
const STREAMED_TOKEN_CLASS = 'jp-GhostText-streamedToken';
const STREAMING_INDICATOR_CLASS = 'jp-GhostText-streamingIndicator';
const ERROR_INDICATOR_CLASS = 'jp-GhostText-errorIndicator';
const HIDDEN_LINES_CLASS = 'jp-GhostText-hiddenLines';

/**
 * Ghost text content and placement.
 */
export interface IGhostText {
  /**
   * Offset in the editor where the ghost text should be placed
   */
  from: number;
  /**
   * The content of the ghost text.
   */
  content: string;
  /**
   * The identifier of the completion provider.
   */
  providerId: string;
  /**
   * The tokens added in the last stream update, must be a suffix of the content.
   */
  addedPart?: string;
  /**
   * Whether streaming is in progress.
   */
  streaming?: boolean;
  /**
   * Maximum number of lines to show.
   */
  maxLines?: number;
  /**
   * Minimum number of lines to reserve (to avoid frequent resizing).
   */
  minLines?: number;
  /**
   * An error occurred in the request.
   */
  error?: {
    /**
     * A message explaining the error.
     */
    message?: string;
  };
  /**
   * Callback to execute when pointer enters the boundary of the ghost text.
   */
  onPointerOver?: () => void;
  /**
   * Callback to execute when pointer leaves the boundary of the ghost text.
   */
  onPointerLeave?: () => void;
}

export class GhostTextManager {
  constructor(protected options: GhostTextManager.IOptions) {
    // no-op
  }

  /**
   * Typing animation.
   */
  static streamingAnimation: 'none' | 'uncover' = 'uncover';

  /**
   * Delay for removal of line spacer.
   */
  static spacerRemovalDelay: number = 700;

  /**
   * Duration for line spacer removal.
   */
  static spacerRemovalDuration: number = 300;

  /**
   * Place ghost text in an editor.
   */
  placeGhost(view: EditorView, text: IGhostText): void {
    const effects: StateEffect<unknown>[] = [Private.addMark.of(text)];

    if (!view.state.field(Private.markField, false)) {
      effects.push(StateEffect.appendConfig.of([Private.markField]));
      effects.push(
        StateEffect.appendConfig.of([
          EditorView.domEventHandlers({
            blur: (event: FocusEvent) => {
              if (this.options.onBlur(event) === false) {
                return true;
              }
              const effects: StateEffect<unknown>[] = [
                Private.removeMark.of(null)
              ];
              // Only execute it after editor update has completed.
              setTimeout(() => {
                view.dispatch({ effects });
              }, 0);
            }
          })
        ])
      );
    }
    view.dispatch({ effects });
  }
  /**
   * Clear all ghost texts from the editor.
   */
  clearGhosts(view: EditorView) {
    const effects: StateEffect<unknown>[] = [Private.removeMark.of(null)];
    view.dispatch({ effects });
  }
}

class GhostTextWidget extends WidgetType {
  constructor(protected readonly options: Omit<IGhostText, 'from'>) {
    super();
  }

  isSpacer = false;

  eq(other: GhostTextWidget) {
    return (
      other.content == this.content &&
      other.options.streaming === this.options.streaming &&
      other.options.error === this.options.error
    );
  }

  get lineBreaks() {
    return (this.content.match(/\n/g) || '').length;
  }

  updateDOM(dom: HTMLElement, _view: EditorView): boolean {
    this._updateDOM(dom);
    return true;
  }

  get content() {
    return this.options.content;
  }

  toDOM() {
    let wrap = document.createElement('span');
    if (this.options.onPointerOver) {
      wrap.addEventListener('pointerover', this.options.onPointerOver);
    }
    if (this.options.onPointerLeave) {
      wrap.addEventListener('pointerleave', this.options.onPointerLeave);
    }
    wrap.classList.add(GHOST_TEXT_CLASS);
    wrap.dataset.animation = GhostTextManager.streamingAnimation;
    wrap.dataset.providedBy = this.options.providerId;
    this._updateDOM(wrap);
    return wrap;
  }

  private _removeErrorAnimation(dom: HTMLElement) {
    const elementsToRemove = dom.querySelectorAll(`.${ERROR_INDICATOR_CLASS}`);

    elementsToRemove.forEach(element => {
      element.remove();
    });
  }

  /**
   * Mount the error animation DOM and remove the streaming indicator if any.
   */
  private _mountErrorAnimation(dom: HTMLElement) {
    const errorIndicator = document.createElement('span');
    errorIndicator.className = ERROR_INDICATOR_CLASS;
    const error = this.options.error;
    if (error?.message) {
      errorIndicator.title = error?.message;
    }

    // Delete stream and previous error animation
    const elementsToRemove = dom.querySelectorAll(
      `.${STREAMING_INDICATOR_CLASS}, .${ERROR_INDICATOR_CLASS}`
    );

    elementsToRemove.forEach(element => {
      element.remove();
    });

    dom.appendChild(errorIndicator);
  }

  private _updateDOM(dom: HTMLElement) {
    if (this.options.error) {
      this._mountErrorAnimation(dom);

      this._clearErrorTimeout = setTimeout(() => {
        this._removeErrorAnimation(dom);
        this._clearErrorTimeout = null;
      }, 5000);
      return;
    }
    // If not in an error anymore, clear the error indicator
    if (this._clearErrorTimeout !== null) {
      clearTimeout(this._clearErrorTimeout);
      this._removeErrorAnimation(dom);
      this._clearErrorTimeout = null;
    }

    let content = this.content;
    let hiddenContent = '';
    let addition = this.options.addedPart;

    if (addition) {
      if (addition.startsWith('\n')) {
        // Show the new line straight away to ensure proper positioning.
        addition = addition.substring(1);
      }
      content = content.substring(0, content.length - addition.length);
    }

    if (this.options.maxLines) {
      // Split into content to show immediately and the hidden part
      const lines = content.split('\n');
      content = lines.slice(0, this.options.maxLines).join('\n');
      hiddenContent = lines.slice(this.options.maxLines).join('\n');
    }

    const minLines = Math.min(
      this.options.minLines ?? 0,
      this.options.maxLines ?? Infinity
    );
    const linesToAdd = Math.max(0, minLines - content.split('\n').length + 1);
    const placeHolderLines = new Array(linesToAdd).fill('').join('\n');

    if (this.isSpacer) {
      dom.innerText = content + placeHolderLines;
      return;
    }
    dom.innerText = content;

    let streamedTokenHost = dom;

    if (hiddenContent.length > 0) {
      const hiddenWrapper = document.createElement('span');
      hiddenWrapper.className = 'jp-GhostText-hiddenWrapper';
      dom.appendChild(hiddenWrapper);
      const expandOnHover = document.createElement('span');
      expandOnHover.className = 'jp-GhostText-expandHidden';
      expandOnHover.innerText = '⇓';
      const hiddenPart = document.createElement('span');
      hiddenWrapper.appendChild(expandOnHover);
      hiddenPart.className = HIDDEN_LINES_CLASS;
      hiddenPart.innerText = '\n' + hiddenContent;
      hiddenWrapper.appendChild(hiddenPart);
      streamedTokenHost = hiddenPart;
    }

    if (addition) {
      const addedPart = document.createElement('span');
      addedPart.className = STREAMED_TOKEN_CLASS;
      addedPart.innerText = addition;
      streamedTokenHost.appendChild(addedPart);
    }

    // Add "streaming-in-progress" indicator
    if (this.options.streaming) {
      const streamingIndicator = document.createElement('span');
      streamingIndicator.className = STREAMING_INDICATOR_CLASS;
      streamedTokenHost.appendChild(streamingIndicator);
    }

    if (placeHolderLines.length > 0) {
      const placeholderLinesNode = document.createTextNode(placeHolderLines);
      streamedTokenHost.appendChild(placeholderLinesNode);
    }
  }
  destroy(dom: HTMLElement) {
    if (this.options.onPointerOver) {
      dom.removeEventListener('pointerover', this.options.onPointerOver);
    }
    if (this.options.onPointerLeave) {
      dom.removeEventListener('pointerleave', this.options.onPointerLeave);
    }
    super.destroy(dom);
  }

  private _clearErrorTimeout: ReturnType<typeof setTimeout> | null = null;
}

export namespace GhostTextManager {
  /**
   * The initialization options for ghost text manager.
   */
  export interface IOptions {
    /**
     * Callback for editor `blur` event.
     * Returning true will prevent the default action of removing current ghost.
     */
    onBlur(event: FocusEvent): boolean;
  }
}

/**
 * Spacers are used to reduce height jitter in the transition between multi-line inline suggestions.
 * In particular, when user removes a letter they will often get a new suggestion in split-second,
 * but without spacer they would see the editor collapse in height and then elongate again.
 */
class TransientSpacerWidget extends GhostTextWidget {
  isSpacer = true;
}

class TransientLineSpacerWidget extends TransientSpacerWidget {
  toDOM() {
    const wrap = super.toDOM();
    wrap.classList.add(TRANSIENT_LINE_SPACER_CLASS);
    wrap.style.animationDelay = GhostTextManager.spacerRemovalDelay + 'ms';
    wrap.style.animationDuration =
      GhostTextManager.spacerRemovalDuration + 'ms';
    return wrap;
  }
}

class TransientLetterSpacerWidget extends TransientSpacerWidget {
  get content() {
    return this.options.content[0];
  }

  toDOM() {
    const wrap = super.toDOM();
    wrap.classList.add(TRANSIENT_LETTER_SPACER_CLASS);
    return wrap;
  }
}

namespace Private {
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

  export const addMark = StateEffect.define<IGhostText>({
    map: (old, change) => ({
      ...old,
      from: change.mapPos(old.from),
      to: change.mapPos(old.from + old.content.length)
    })
  });

  export const removeMark = StateEffect.define<null>();

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
      widget: new GhostTextWidget(spec),
      side: 1,
      ghostSpec: spec
    });
    // Widget decorations can only have zero-length ranges
    return ghost.range(
      Math.min(spec.from, tr.newDoc.length),
      Math.min(spec.from, tr.newDoc.length)
    );
  }

  function createSpacer(
    spec: IGhostText,
    tr: Transaction,
    timeout: number = 1000
  ) {
    // no spacer needed if content is only one character long.
    if (spec.content.length < 2) {
      return [];
    }

    const timeoutInfo = {
      elapsed: false
    };
    setTimeout(() => {
      timeoutInfo.elapsed = true;
    }, timeout);

    const characterSpacer = Decoration.widget({
      widget: new TransientLetterSpacerWidget(spec),
      side: 1,
      timeoutInfo
    });
    const lineSpacer = Decoration.widget({
      widget: new TransientLineSpacerWidget(spec),
      side: 1,
      timeoutInfo
    });
    // We add two different spacers: one to temporarily preserve height of as many lines
    // as there were in the content, and the other (character spacer) to ensure that
    // cursor is not malformed by the presence of the line spacer.
    return [
      characterSpacer.range(
        Math.min(spec.from, tr.newDoc.length),
        Math.min(spec.from, tr.newDoc.length)
      ),
      lineSpacer.range(
        Math.min(spec.from, tr.newDoc.length),
        Math.min(spec.from, tr.newDoc.length)
      )
    ];
  }

  export const markField = StateField.define<DecorationSet>({
    create() {
      return Decoration.none;
    },
    update(marks, tr) {
      const data = chooseAction(tr);
      // remove spacers after timeout
      marks = marks.update({
        filter: (_from, _to, value) => {
          if (value.spec.widget instanceof TransientSpacerWidget) {
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
            cursor.value.spec.widget instanceof TransientSpacerWidget
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
          // we add a temporary spacer widget(s) which will be removed in a future update
          // allowing a slight delay between getting a new suggestion and reducing cell height
          const newWidgets = shouldRemoveGhost
            ? createSpacer(originalSpec, tr)
            : [createWidget(spec, tr)];
          const newValues = newWidgets.map(widget => widget.value);
          marks = marks.update({
            add: newWidgets,
            filter: (_from, _to, value) => newValues.includes(value)
          });
          if (shouldRemoveGhost) {
            // TODO this can error out when deleting text, ideally a clean solution would be used.
            try {
              marks = marks.map(tr.changes);
            } catch (e) {
              console.warn(e);
              return Decoration.none;
            }
          }
          return marks;
        }
      }
    },
    provide: f => EditorView.decorations.from(f)
  });
}
