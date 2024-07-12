/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

// Inspired by https://discuss.codemirror.net/t/how-to-implement-ruler/4616/

import { Extension, Facet } from '@codemirror/state';
import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { JSONExt } from '@lumino/coreutils';

const RULERS_CLASSNAME = 'cm-rulers';

/**
 * Rulers style
 */
const baseTheme = EditorView.baseTheme({
  [`.${RULERS_CLASSNAME}`]: { borderRight: '1px dotted gray', opacity: 0.7 }
});

/**
 * Rulers facet
 */
const rulerConfig = Facet.define<number[], number[]>({
  // Merge all unique values
  combine(value) {
    const final = value.reduce(
      (agg, arr) =>
        agg.concat(
          // Check value is not in aggregate nor multiple time in the array.
          arr.filter((v, idx) => !agg.includes(v) && idx == arr.lastIndexOf(v))
        ),
      []
    );
    return final;
  }
});

/**
 * View plugin displaying the rulers
 */
const plugin = ViewPlugin.fromClass(
  class {
    constructor(view: EditorView) {
      this.rulersContainer = view.dom.appendChild(
        document.createElement('div')
      );
      this.rulersContainer.style.cssText = `
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                overflow: hidden;
            `;

      const defaultCharacterWidth = view.defaultCharacterWidth;
      const widths = view.state.facet(rulerConfig);
      const guttersWidths =
        view.scrollDOM.querySelector('.cm-gutters')?.clientWidth ?? 0;
      this.rulers = widths.map(width => {
        const ruler = this.rulersContainer.appendChild(
          document.createElement('div')
        );
        ruler.classList.add(RULERS_CLASSNAME);
        ruler.style.cssText = `
                position: absolute;
                left: ${guttersWidths + width * defaultCharacterWidth}px;
                height: 100%;
            `;
        // FIXME: This should be equal to the amount of padding on a line.
        // This value should be extracted from CodeMirror rather than hardcoded.
        ruler.style.width = '6px';

        return ruler;
      });
    }

    update(update: ViewUpdate) {
      const widths = update.view.state.facet(rulerConfig);

      if (
        update.viewportChanged ||
        update.geometryChanged ||
        !JSONExt.deepEqual(widths, update.startState.facet(rulerConfig))
      ) {
        const guttersWidth =
          update.view.scrollDOM.querySelector('.cm-gutters')?.clientWidth ?? 0;
        const defaultCharacterWidth = update.view.defaultCharacterWidth;
        this.rulers.forEach((ruler, rulerIdx) => {
          ruler.style.left = `${
            guttersWidth + widths[rulerIdx] * defaultCharacterWidth
          }px`;
        });
      }
    }

    destroy() {
      this.rulers.forEach(ruler => {
        ruler.remove();
      });
      this.rulersContainer.remove();
    }

    rulersContainer: HTMLDivElement;
    rulers: HTMLDivElement[];
  }
);

/**
 * Extension for CodeMirror 6 displaying rulers.
 *
 * @param value Rulers position
 * @returns CodeMirror 6 extension
 */
export function rulers(value: number[]): Extension {
  return [baseTheme, rulerConfig.of(value), plugin];
}
