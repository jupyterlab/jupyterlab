// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  INotebookModel,
  NotebookPanel,
  NotebookSearchProvider
} from '@jupyterlab/notebook';
import { Context } from '@jupyterlab/docregistry';
import { NBTestUtils } from '@jupyterlab/notebook/lib/testutils';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { signalToPromise } from '@jupyterlab/testing';
import * as utils from './utils';
import { IReplaceOptions } from '@jupyterlab/documentsearch';

/**
 * To avoid relying on ydoc passing the selections via server
 * (this test runs without a server for efficiency) we also set
 * selections on the model directly.
 */
async function setSelections(
  editor: CodeEditor.IEditor,
  selections: CodeEditor.ITextSelection[]
) {
  const promise = signalToPromise(editor.model.selections.changed);
  editor.setSelections(selections);
  editor.model.selections.set('main-selection', selections);
  await promise;
}

class TestProvider extends NotebookSearchProvider {
  get cellChangeHandled(): Promise<void> {
    // ensure `_delayedActiveCellChangeHandler` fired
    jest.advanceTimersByTime(0);
    // ensure `_delayedActiveCellChangeHandler` has completed
    return this.delayedActiveCellChangeHandlerReady;
  }
}

jest.useFakeTimers();

describe('@jupyterlab/notebook', () => {
  describe('NotebookSearchProvider', () => {
    let context: Context<INotebookModel>;
    let panel: NotebookPanel;
    let provider: TestProvider;

    beforeEach(async () => {
      context = await NBTestUtils.createMockContext(false);
      panel = utils.createNotebookPanel(context);
      provider = new TestProvider(panel);
      panel.model!.sharedModel.insertCells(0, [
        { cell_type: 'markdown', source: 'test1 test2' },
        { cell_type: 'code', source: 'test3' }
      ]);
    });

    afterEach(() => {
      context.dispose();
    });

    describe('#matchesCount', () => {
      it('should return number of matches', async () => {
        await provider.startQuery(/test/, undefined);
        expect(provider.matchesCount).toBe(3);
      });

      it('should return number of matches in selected lines', async () => {
        panel.model!.sharedModel.deleteCellRange(0, 2);
        panel.model!.sharedModel.insertCells(0, [
          { cell_type: 'code', source: 'test1\ntest2\ntest3\ntest4\ntest5' }
        ]);
        panel.content.activeCellIndex = 0;
        panel.content.mode = 'edit';

        await provider.startQuery(/test/, { selection: true });
        expect(provider.matchesCount).toBe(5);
        await setSelections(panel.content.activeCell!.editor!, [
          {
            uuid: 'main-selection',
            start: { line: 1, column: 0 },
            end: { line: 2, column: 6 }
          }
        ]);
        expect(provider.matchesCount).toBe(3);
        await setSelections(panel.content.activeCell!.editor!, [
          {
            uuid: 'main-selection',
            start: { line: 1, column: 0 },
            end: { line: 1, column: 6 }
          }
        ]);
        expect(provider.matchesCount).toBe(2);
        await provider.endQuery();
      });
    });

    describe('#highlightNext()', () => {
      it('should highlight next match', async () => {
        await provider.startQuery(/test/, undefined);
        expect(provider.currentMatchIndex).toBe(0);
        await provider.highlightNext();
        expect(provider.currentMatchIndex).toBe(1);
        await provider.highlightNext();
        expect(provider.currentMatchIndex).toBe(2);
        await provider.endQuery();
      });

      it('should loop back to first match', async () => {
        panel.content.activeCellIndex = 1;
        await provider.startQuery(/test/, undefined);
        expect(panel.content.activeCellIndex).toBe(1);
        expect(provider.currentMatchIndex).toBe(2);
        await provider.highlightNext();
        expect(panel.content.activeCellIndex).toBe(0);
        expect(provider.currentMatchIndex).toBe(0);
        await provider.endQuery();
      });

      it('should loop back to first match when limited to single cell', async () => {
        panel.content.activeCellIndex = 0;
        panel.content.mode = 'command';
        await provider.startQuery(/test/, { selection: true });
        expect(panel.content.activeCellIndex).toBe(0);
        expect(provider.currentMatchIndex).toBe(0);
        await provider.highlightNext();
        expect(provider.currentMatchIndex).toBe(1);
        await provider.highlightNext();
        expect(provider.currentMatchIndex).toBe(0);
        expect(panel.content.activeCellIndex).toBe(0);
        await provider.endQuery();
      });

      it('should loop back to first match in selected lines', async () => {
        panel.model!.sharedModel.deleteCellRange(0, 2);
        panel.model!.sharedModel.insertCells(0, [
          { cell_type: 'code', source: 'test1\ntest2\ntest3\ntest4\ntest5' }
        ]);
        panel.content.activeCellIndex = 0;
        panel.content.mode = 'edit';

        await provider.startQuery(/test/, { selection: true });
        await setSelections(panel.content.activeCell!.editor!, [
          {
            uuid: 'main-selection',
            start: { line: 1, column: 0 },
            end: { line: 2, column: 6 }
          }
        ]);
        expect(panel.content.activeCellIndex).toBe(0);
        expect(provider.currentMatchIndex).toBe(0);
        await provider.highlightNext();
        expect(provider.currentMatchIndex).toBe(1);
        await provider.highlightNext();
        expect(provider.currentMatchIndex).toBe(2);
        await provider.highlightNext();
        expect(provider.currentMatchIndex).toBe(0);
        await provider.endQuery();
      });

      it('should do nothing if there are no cells', async () => {
        await provider.startQuery(/test/, undefined);
        for (let _ of panel.model!.sharedModel.cells) {
          panel.model!.sharedModel.deleteCell(0);
        }
        await provider.highlightNext();
        expect(provider.currentMatchIndex).toBe(null);
        await provider.endQuery();
      });
    });

    describe('#highlightPrevious()', () => {
      it('should highlight previous match', async () => {
        panel.content.activeCellIndex = 1;
        await provider.startQuery(/tes/, undefined);
        expect(provider.currentMatchIndex).toBe(2);
        expect(panel.content.activeCellIndex).toBe(1);
        await provider.highlightPrevious();
        expect(panel.content.activeCellIndex).toBe(0);
        expect(provider.currentMatchIndex).toBe(1);
        await provider.highlightPrevious();
        expect(panel.content.activeCellIndex).toBe(0);
        expect(provider.currentMatchIndex).toBe(0);
        await provider.endQuery();
      });

      it('should loop back to last match', async () => {
        await provider.startQuery(/test/, undefined);
        expect(provider.currentMatchIndex).toBe(0);
        await provider.highlightPrevious();
        expect(provider.currentMatchIndex).toBe(2);
        await provider.endQuery();
      });

      it('should go to previous cell if there is no current match in active cell', async () => {
        await provider.startQuery(/test/, undefined);
        await provider.highlightNext();
        await provider.highlightNext();
        expect(provider.currentMatchIndex).toBe(2);
        expect(panel.content.activeCellIndex).toBe(1);
        await provider.highlightPrevious();
        expect(panel.content.activeCellIndex).toBe(0);
        await provider.endQuery();
      });
    });

    describe('#replaceCurrentMatch()', () => {
      it('should replace with a shorter text and highlight next', async () => {
        await provider.startQuery(/test\d/, undefined);
        expect(provider.currentMatchIndex).toBe(0);
        let replaced = await provider.replaceCurrentMatch('bar');
        expect(replaced).toBe(true);
        const source = panel.model!.cells.get(0).sharedModel.getSource();
        expect(source).toBe('bar test2');
        expect(provider.currentMatchIndex).toBe(0);
      });

      it('should start in the middle of a code cell, replace, and highlight next', async () => {
        panel.model!.sharedModel.deleteCellRange(0, 2);
        panel.model!.sharedModel.insertCells(0, [
          { cell_type: 'code', source: 'test1 test2 test3' }
        ]);
        panel.content.activeCellIndex = 0;
        await provider.cellChangeHandled;
        panel.content.mode = 'edit';

        // Pick the spot before the second element.
        await panel.content.activeCell!.editor!.setCursorPosition({
          line: 0,
          column: 'test1 '.length
        });

        await provider.startQuery(/test\d/, { selection: true });

        expect(provider.currentMatchIndex).toBe(1);
        let replaced = await provider.replaceCurrentMatch('bar');
        expect(replaced).toBe(true);
        const source = panel.model!.cells.get(0).sharedModel.getSource();
        expect(source).toBe('test1 bar test3');
        expect(provider.currentMatchIndex).toBe(1);
      });

      it('should substitute groups in regular expressions', async () => {
        await provider.startQuery(/test(\d)/, undefined);
        expect(provider.currentMatchIndex).toBe(0);
        await provider.highlightNext();
        expect(provider.currentMatchIndex).toBe(1);
        let replaced = await provider.replaceCurrentMatch(
          '$1st_bar (was $&)',
          false,
          { regularExpression: true }
        );
        expect(replaced).toBe(true);
        const source = panel.model!.cells.get(0).sharedModel.getSource();
        expect(source).toBe('test1 2st_bar (was test2)');
      });

      it('should not substitute if regular expression toggle is off', async () => {
        await provider.startQuery(/test(\d)/, undefined);
        expect(provider.currentMatchIndex).toBe(0);
        let replaced = await provider.replaceCurrentMatch(
          '$1st_bar (was $&)',
          false,
          { regularExpression: false }
        );
        expect(replaced).toBe(true);
        const source = panel.model!.cells.get(0).sharedModel.getSource();
        expect(source).toBe('$1st_bar (was $&) test2');
      });

      it('should replace with a longer text and highlight next', async () => {
        await provider.startQuery(/test\d/, undefined);
        expect(provider.currentMatchIndex).toBe(0);
        let replaced = await provider.replaceCurrentMatch('rabarbar');
        expect(replaced).toBe(true);
        let source = panel.model!.cells.get(0).sharedModel.getSource();
        expect(source).toBe('rabarbar test2');
        expect(provider.currentMatchIndex).toBe(0);

        replaced = await provider.replaceCurrentMatch('rabarbar');
        expect(replaced).toBe(true);
        source = panel.model!.cells.get(0).sharedModel.getSource();
        expect(source).toBe('rabarbar rabarbar');
        expect(provider.currentMatchIndex).toBe(0);

        replaced = await provider.replaceCurrentMatch('rabarbar');
        expect(replaced).toBe(true);
        source = panel.model!.cells.get(1).sharedModel.getSource();
        expect(source).toBe('rabarbar');
        expect(provider.currentMatchIndex).toBe(null);
      });

      it('should not replace the current match in a read-only cell', async () => {
        panel.model!.sharedModel.insertCells(0, [
          {
            cell_type: 'markdown',
            source: 'test1',
            metadata: { editable: false }
          },
          { cell_type: 'code', source: 'test2', metadata: { editable: false } }
        ]);

        await provider.startQuery(/test\d/, undefined);
        expect(provider.currentMatchIndex).toBe(0);
        let replaced = await provider.replaceCurrentMatch('bar');
        expect(replaced).toBe(false);
        const source = panel.model!.cells.get(0).sharedModel.getSource();
        expect(source).toBe('test1');

        await provider.highlightNext();
        expect(provider.currentMatchIndex).toBe(1);
        replaced = await provider.replaceCurrentMatch('bar');
        expect(replaced).toBe(false);
        const source1 = panel.model!.cells.get(1).sharedModel.getSource();
        expect(source1).toBe('test2');

        await provider.highlightNext();
        expect(provider.currentMatchIndex).toBe(2);
        replaced = await provider.replaceCurrentMatch('bar');
        expect(replaced).toBe(true);
        const source2 = panel.model!.cells.get(2).sharedModel.getSource();
        expect(source2).toBe('bar test2');
      });
    });

    describe('#replaceAllMatches()', () => {
      it('should replace all occurrences across cells', async () => {
        await provider.startQuery(/test\d/, undefined);
        await provider.highlightNext();
        const replaced = await provider.replaceAllMatches('test0');
        expect(replaced).toBe(true);
        let source = panel.model!.cells.get(0).sharedModel.getSource();
        expect(source).toBe('test0 test0');
        source = panel.model!.cells.get(1).sharedModel.getSource();
        expect(source).toBe('test0');
        expect(provider.currentMatchIndex).toBe(null);
      });

      it('should only replace within first cell', async () => {
        await provider.startQuery(/test/, { selection: true });
        panel.content.mode = 'command';
        panel.content.activeCellIndex = 0;
        await provider.cellChangeHandled;
        expect(provider.currentMatchIndex).toBe(0);
        const replaced = await provider.replaceAllMatches('bar');
        expect(replaced).toBe(true);
        let source = panel.model!.cells.get(0).sharedModel.getSource();
        expect(source).toBe('bar1 bar2');
        source = panel.model!.cells.get(1).sharedModel.getSource();
        expect(source).toBe('test3');
        await provider.endQuery();
      });

      it('should only replace within second cell', async () => {
        await provider.startQuery(/test/, { selection: true });
        panel.content.mode = 'command';
        panel.content.activeCellIndex = 1;
        await provider.cellChangeHandled;
        const replaced = await provider.replaceAllMatches('bar');
        expect(replaced).toBe(true);
        let source = panel.model!.cells.get(0).sharedModel.getSource();
        expect(source).toBe('test1 test2');
        source = panel.model!.cells.get(1).sharedModel.getSource();
        expect(source).toBe('bar3');
        await provider.endQuery();
      });

      it('should only replace within selected lines', async () => {
        panel.model!.sharedModel.deleteCellRange(0, 2);
        panel.model!.sharedModel.insertCells(0, [
          { cell_type: 'code', source: 'test1\ntest2\ntest3\ntest4\ntest5' }
        ]);
        panel.content.activeCellIndex = 0;
        panel.content.mode = 'edit';

        await provider.startQuery(/test/, { selection: true });
        await setSelections(panel.content.activeCell!.editor!, [
          {
            uuid: 'main-selection',
            start: { line: 1, column: 0 },
            end: { line: 2, column: 6 }
          }
        ]);
        const replaced = await provider.replaceAllMatches('bar');
        expect(replaced).toBe(true);
        let source = panel.model!.cells.get(0).sharedModel.getSource();
        expect(source).toBe('test1\nbar2\nbar3\nbar4\ntest5');
        await provider.endQuery();
      });

      it('should not replace all matches in read-only cells', async () => {
        panel.model!.sharedModel.insertCells(2, [
          {
            cell_type: 'markdown',
            source: 'test1 test2',
            metadata: { editable: false }
          },
          {
            cell_type: 'code',
            source: 'test1 test2 test3',
            metadata: { editable: false }
          }
        ]);
        await provider.startQuery(/test\d/, undefined);
        await provider.highlightNext();
        const replaced = await provider.replaceAllMatches('test0');
        expect(replaced).toBe(true);
        let source = panel.model!.cells.get(0).sharedModel.getSource();
        expect(source).toBe('test0 test0');
        source = panel.model!.cells.get(1).sharedModel.getSource();
        expect(source).toBe('test0');
        source = panel.model!.cells.get(2).sharedModel.getSource();
        expect(source).toBe('test1 test2');
        source = panel.model!.cells.get(3).sharedModel.getSource();
        expect(source).toBe('test1 test2 test3');
        expect(provider.currentMatchIndex).toBe(null);
      });

      it('should replace all matches using regex', async () => {
        panel.model!.sharedModel.insertCells(0, [
          {
            cell_type: 'markdown',
            source: 'a=123',
            metadata: { editable: true }
          },
          {
            cell_type: 'code',
            source: 'a=123\nb=234'
          }
        ]);
        const replaceOptions: IReplaceOptions = {
          regularExpression: true
        };

        await provider.startQuery(/(\d+)/, undefined);
        await provider.highlightNext();
        const replaced = await provider.replaceAllMatches(
          '$1+1',
          replaceOptions
        );
        expect(replaced).toBe(true);
        let source = panel.model!.cells.get(0).sharedModel.getSource();
        expect(source).toBe('a=123+1');
        source = panel.model!.cells.get(1).sharedModel.getSource();
        expect(source).toBe('a=123+1\nb=234+1');
        expect(provider.currentMatchIndex).toBe(null);
      });
    });

    describe('#getSelectionState()', () => {
      it('should reflect cell selection state in command mode', async () => {
        panel.content.mode = 'command';
        panel.content.activeCellIndex = 0;
        let state = provider.getSelectionState();
        // Currently it is impossible to select a single cell (a cell is always
        // active; while this can be seen as always having a selected cell, this
        // is not deemed useful for this feature).
        expect(state).toBe('none');
        panel.content.select(panel.content.widgets[0]);
        await signalToPromise(provider.filtersChanged);
        panel.content.select(panel.content.widgets[1]);
        await signalToPromise(provider.filtersChanged);
        state = provider.getSelectionState();
        expect(state).toBe('multiple');
      });

      it('should reflect line selection state in edit mode', async () => {
        panel.model!.sharedModel.deleteCellRange(0, 2);
        panel.model!.sharedModel.insertCells(0, [
          { cell_type: 'code', source: 'test1\ntest2\ntest3\ntest4\ntest5' }
        ]);
        panel.content.activeCellIndex = 0;
        panel.content.mode = 'edit';
        let state = provider.getSelectionState();
        expect(state).toBe('none');

        await setSelections(panel.content.activeCell!.editor!, [
          {
            uuid: 'main-selection',
            start: { line: 1, column: 0 },
            end: { line: 2, column: 6 }
          }
        ]);
        state = provider.getSelectionState();
        expect(state).toBe('multiple');

        await setSelections(panel.content.activeCell!.editor!, [
          {
            uuid: 'main-selection',
            start: { line: 1, column: 0 },
            end: { line: 1, column: 5 }
          }
        ]);
        state = provider.getSelectionState();
        expect(state).toBe('single');
      });
    });
  });
});
