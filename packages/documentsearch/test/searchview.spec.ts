// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

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
  });
});
