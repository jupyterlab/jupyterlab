// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  COMPLETER_ENABLED_CLASS,
  COMPLETER_LINE_BEGINNING_CLASS,
  COMPLETER_TAB_CONTEXTS_ATTRIBUTE
} from '@jupyterlab/codeeditor';
import { StateCommands } from '@jupyterlab/codemirror';
import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

describe('@jupyterlab/codemirror', () => {
  describe('StateCommands', () => {
    describe('#indentMoreOrInsertTab', () => {
      let scopeRoot: HTMLElement;
      let host: HTMLElement;
      let view: EditorView;

      function createView(options: {
        doc?: string;
        cursor?: number;
        selection?: { from: number; to: number };
      }): EditorView {
        const { doc = 'x', cursor, selection } = options;
        const range = selection
          ? EditorSelection.range(selection.from, selection.to)
          : EditorSelection.cursor(cursor ?? doc.length);

        return new EditorView({
          state: EditorState.create({ doc, selection: range }),
          parent: host
        });
      }

      beforeEach(() => {
        scopeRoot = document.createElement('div');
        scopeRoot.className = 'jp-Notebook';
        host = document.createElement('div');
        scopeRoot.appendChild(host);
        document.body.appendChild(scopeRoot);

        delete document.documentElement.dataset[
          COMPLETER_TAB_CONTEXTS_ATTRIBUTE
        ];
      });

      afterEach(() => {
        view?.destroy();
        scopeRoot.remove();
        delete document.documentElement.dataset[
          COMPLETER_TAB_CONTEXTS_ATTRIBUTE
        ];
      });

      it('should insert a tab when the completer is not enabled', () => {
        view = createView({ doc: 'foo' });

        StateCommands.indentMoreOrInsertTab(view);

        expect(view.state.doc.toString()).toEqual('foo\t');
      });

      it('should indent when the cursor is at the beginning of the line, regardless of the completer', () => {
        host.classList.add(COMPLETER_ENABLED_CLASS);
        host.classList.add(COMPLETER_LINE_BEGINNING_CLASS);
        document.documentElement.dataset[COMPLETER_TAB_CONTEXTS_ATTRIBUTE] =
          'notebook';
        view = createView({ doc: '', cursor: 0 });

        StateCommands.indentMoreOrInsertTab(view);

        expect(view.state.doc.toString().length).toBeGreaterThan(0);
      });

      it('should indent a non-empty selection (COMPLETER_ENABLED_CLASS is never set with a selection, per CompletionHandler)', () => {
        view = createView({ doc: 'foo\nbar', selection: { from: 0, to: 3 } });

        const before = view.state.doc.toString();
        StateCommands.indentMoreOrInsertTab(view);

        expect(view.state.doc.toString()).not.toEqual(before);
      });

      it('should defer to the completer when Tab is live-bound for the current context', () => {
        host.classList.add(COMPLETER_ENABLED_CLASS);
        document.documentElement.dataset[COMPLETER_TAB_CONTEXTS_ATTRIBUTE] =
          'notebook';
        view = createView({ doc: 'pri' });

        const handled = StateCommands.indentMoreOrInsertTab(view);

        expect(handled).toEqual(false);
        expect(view.state.doc.toString()).toEqual('pri');
      });

      it('should insert a tab when the completer is enabled but nothing is bound to Tab for any context', () => {
        host.classList.add(COMPLETER_ENABLED_CLASS);
        document.documentElement.dataset[COMPLETER_TAB_CONTEXTS_ATTRIBUTE] = '';
        view = createView({ doc: 'pri' });

        StateCommands.indentMoreOrInsertTab(view);

        expect(view.state.doc.toString()).toEqual('pri\t');
      });

      it('should insert a tab when Tab is only live-bound for a different context', () => {
        host.classList.add(COMPLETER_ENABLED_CLASS);
        // Console's completer shortcut is bound, but this editor is in a
        // notebook (`scopeRoot` is `.jp-Notebook`) — it should not borrow
        // console's binding.
        document.documentElement.dataset[COMPLETER_TAB_CONTEXTS_ATTRIBUTE] =
          'console';
        view = createView({ doc: 'pri' });

        StateCommands.indentMoreOrInsertTab(view);

        expect(view.state.doc.toString()).toEqual('pri\t');
      });
    });
  });
});
