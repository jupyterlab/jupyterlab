// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  INotebookModel,
  NotebookPanel,
  NotebookSearchProvider
} from '@jupyterlab/notebook';
import { Context } from '@jupyterlab/docregistry';
import { initNotebookContext } from '@jupyterlab/notebook/lib/testutils';
import { JupyterServer } from '@jupyterlab/testing';
import * as utils from './utils';

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

describe('@jupyterlab/notebook', () => {
  describe('NotebookSearchProvider', () => {
    let context: Context<INotebookModel>;
    let panel: NotebookPanel;
    let provider: NotebookSearchProvider;

    beforeEach(async () => {
      context = await initNotebookContext();
      panel = utils.createNotebookPanel(context);
      provider = new NotebookSearchProvider(panel);
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
    });

    describe('#highlightNext()', () => {
      it('should highlight next match', async () => {
        await provider.startQuery(/test/, undefined);
        await provider.highlightNext();
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
        await provider.highlightNext();
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
        await provider.highlightNext();
        expect(provider.currentMatchIndex).toBe(0);
        await provider.highlightPrevious();
        expect(provider.currentMatchIndex).toBe(2);
        await provider.endQuery();
      });
    });

    describe('#replaceCurrentMatch()', () => {
      it('should replace with a shorter text and highlight next', async () => {
        await provider.startQuery(/test\d/, undefined);
        await provider.highlightNext();
        expect(provider.currentMatchIndex).toBe(0);
        let replaced = await provider.replaceCurrentMatch('bar');
        expect(replaced).toBe(true);
        const source = panel.model!.cells.get(0).sharedModel.getSource();
        expect(source).toBe('bar test2');
        expect(provider.currentMatchIndex).toBe(0);
      });

      it('should substitute groups in regular expressions', async () => {
        await provider.startQuery(/test(\d)/, undefined);
        await provider.highlightNext();
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
        await provider.highlightNext();
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
        await provider.highlightNext();
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
    });
  });
});
