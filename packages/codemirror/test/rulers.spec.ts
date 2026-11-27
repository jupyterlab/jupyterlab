// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { rulers } from '@jupyterlab/codemirror';

/**
 * Column of each `.cm-rulers` element, read from its `left` position.
 */
function rulerColumns(view: EditorView): number[] {
  return Array.from(view.dom.querySelectorAll('.cm-rulers'), node => {
    const left = (node as HTMLElement).style.left;
    const match = /(\d+(?:\.\d+)?)ch/.exec(left);
    if (!match) {
      throw new Error(`Ruler has no column in its position: ${left}`);
    }
    return Number(match[1]);
  });
}

describe('@jupyterlab/codemirror', () => {
  describe('rulers()', () => {
    let host: HTMLElement;
    let view: EditorView | undefined;

    beforeEach(() => {
      host = document.createElement('div');
      document.body.appendChild(host);
    });

    afterEach(() => {
      view?.destroy();
      host.remove();
    });

    it('should add and remove ruler elements when the columns are reconfigured', () => {
      const compartment = new Compartment();
      view = new EditorView({
        state: EditorState.create({
          doc: '',
          extensions: [compartment.of(rulers([80]))]
        }),
        parent: host
      });

      expect(view.dom.querySelectorAll('.cm-rulers')).toHaveLength(1);
      expect(rulerColumns(view)).toEqual([80]);

      view.dispatch({
        effects: compartment.reconfigure(rulers([80, 100]))
      });

      expect(view.dom.querySelectorAll('.cm-rulers')).toHaveLength(2);
      expect(rulerColumns(view)).toEqual([80, 100]);

      view.dispatch({
        effects: compartment.reconfigure(rulers([80]))
      });

      expect(view.dom.querySelectorAll('.cm-rulers')).toHaveLength(1);
      expect(rulerColumns(view)).toEqual([80]);
    });
  });
});
