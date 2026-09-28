// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IFilter } from '@jupyterlab/documentsearch';
import {
  SearchDocumentModel,
  SearchDocumentView
} from '@jupyterlab/documentsearch';
import { framePromise, signalToPromise } from '@jupyterlab/testing';
import { Widget } from '@lumino/widgets';
import { MatchListProvider } from './utils';

/**
 * Wait until the view shows the current state of its model.
 */
async function rendered(view: SearchDocumentView): Promise<void> {
  await framePromise();
  await view.renderPromise;
  await framePromise();
}

/**
 * Provider with a filter which declares that it does not support replace.
 */
class NoReplaceFilterProvider extends MatchListProvider {
  getFilters(): { [key: string]: IFilter } {
    return {
      output: {
        title: 'Search Outputs',
        description: 'Search in the outputs.',
        disabledDescription: 'Not available in replace mode.',
        default: false,
        supportReplace: false
      }
    };
  }
}

describe('documentsearch/searchview', () => {
  describe('SearchDocumentView', () => {
    let provider: MatchListProvider;
    let model: SearchDocumentModel;
    let view: SearchDocumentView;

    beforeEach(async () => {
      provider = new MatchListProvider([
        { text: 'query', position: 0 },
        { text: 'query', position: 10, readonly: true }
      ]);
      model = new SearchDocumentModel(provider, 0);
      view = new SearchDocumentView(model);
      Widget.attach(view, document.body);
      view.showReplace();
      model.searchExpression = 'query';
      await signalToPromise(model.stateChanged);
      await rendered(view);
    });

    afterEach(() => {
      view.dispose();
      model.dispose();
      provider.dispose();
    });

    describe('replace button', () => {
      const replaceButton = () =>
        view.node.querySelector<HTMLButtonElement>(
          '.jp-DocumentSearch-replace-button-wrapper'
        )!;

      it('should be enabled on a match which can be replaced', () => {
        expect(replaceButton().disabled).toBe(false);
        expect(replaceButton().title).toBe('Replace');
      });

      it('should be disabled on a read-only match', async () => {
        await model.highlightNext();
        await rendered(view);
        expect(replaceButton().disabled).toBe(true);
        expect(replaceButton().title).toBe(
          'Cannot replace: match is in output or read-only cell'
        );
      });

      it('should be enabled again after the search text is cleared', async () => {
        await model.highlightNext();
        model.searchExpression = '';
        await signalToPromise(model.stateChanged);
        await rendered(view);
        expect(replaceButton().disabled).toBe(false);
      });
    });

    describe('replace all button', () => {
      const replaceAllButton = () =>
        view.node.querySelectorAll<HTMLButtonElement>(
          '.jp-DocumentSearch-replace-button-wrapper'
        )[1];

      it('should be enabled when one match can be replaced', () => {
        expect(replaceAllButton().disabled).toBe(false);
        expect(replaceAllButton().title).toBe('Replace All');
      });

      it('should be disabled when no match can be replaced', async () => {
        const readOnly = new MatchListProvider([
          { text: 'query', position: 0, readonly: true }
        ]);
        view.model = new SearchDocumentModel(readOnly, 0);
        view.model.searchExpression = 'query';
        await signalToPromise(view.model.stateChanged);
        await rendered(view);
        expect(replaceAllButton().disabled).toBe(true);
        expect(replaceAllButton().title).toBe(
          'Cannot replace: all matches are in outputs or read-only cells'
        );
        view.model.dispose();
        readOnly.dispose();
      });
    });

    describe('filters', () => {
      it('should show a filter without replace support as usual in replace mode', async () => {
        const noReplace = new NoReplaceFilterProvider([
          { text: 'query', position: 0 }
        ]);
        view.model = new SearchDocumentModel(noReplace, 0);
        view.model.searchExpression = 'query';
        await signalToPromise(view.model.stateChanged);
        await rendered(view);
        view.node
          .querySelector<HTMLButtonElement>(
            'button[title="Show Search Filters"]'
          )!
          .click();
        await rendered(view);

        const filter = view.node.querySelector<HTMLLabelElement>(
          '.jp-DocumentSearch-search-filter'
        )!;
        expect(filter.title).toBe('Search in the outputs.');
        expect(filter.querySelector('input')!.disabled).toBe(false);
        view.model.dispose();
        noReplace.dispose();
      });
    });
  });
});
