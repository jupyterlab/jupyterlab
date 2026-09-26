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
  });
});
