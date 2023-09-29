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
}

export class GhostTextManager {
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
            blur: () => {
              const effects: StateEffect<unknown>[] = [
                Private.removeMark.of(null)
              ];
              view.dispatch({ effects });
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
  constructor(protected options: Omit<IGhostText, 'from'>) {
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

  get content() {
    return this.options.content;
  }

  toDOM() {
    let wrap = document.createElement('span');
    wrap.classList.add(GHOST_TEXT_CLASS);
    wrap.dataset.providedBy = this.options.providerId;
    wrap.innerText = this.content;
    return wrap;
  }
}

/**
 * Spacers are used to reduce height jitter in the transition between multi-line inline suggestions.
 * In particular, when user removes a letter they will often get a new suggestion in split-second,
 * but without spacer they would see the editor collapse in height and then elongate again.
 */
class TransientSpacerWidget extends GhostTextWidget {
  // no-op
}

class TransientLineSpacerWidget extends TransientSpacerWidget {
  toDOM() {
    const wrap = super.toDOM();
    wrap.classList.add(TRANSIENT_LINE_SPACER_CLASS);
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
    map: ({ from, content, providerId }, change) => ({
      from: change.mapPos(from),
      to: change.mapPos(from + content.length),
      content,
      providerId
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
            marks = marks.map(tr.changes);
          }
          return marks;
        }
      }
    },
    provide: f => EditorView.decorations.from(f)
  });
}
