// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  SearchDocumentModel,
  SearchDocumentView,
  SearchProvider
} from '@jupyterlab/documentsearch';
import type {
  IFilters,
  IReplaceOptions,
  ISearchMatch
} from '@jupyterlab/documentsearch';
import { framePromise } from '@jupyterlab/testing';
import { Widget } from '@lumino/widgets';

class EditableSearchProvider extends SearchProvider {
  readonly isReadOnly = false;

  async startQuery(_query: RegExp, _filters: IFilters): Promise<void> {
    return;
  }
  async endQuery(): Promise<void> {
    return;
  }
  async clearHighlight(): Promise<void> {
    return;
  }
  async highlightNext(): Promise<ISearchMatch | undefined> {
    return undefined;
  }
  async highlightPrevious(): Promise<ISearchMatch | undefined> {
    return undefined;
  }
  async replaceCurrentMatch(
    _newText: string,
    _loop?: boolean,
    _options?: IReplaceOptions
  ): Promise<boolean> {
    return false;
  }
  async replaceAllMatches(
    _newText: string,
    _options?: IReplaceOptions
  ): Promise<boolean> {
    return false;
  }
}

describe('documentsearch/searchview', () => {
  describe('SearchDocumentView', () => {
    let host: Widget;
    let provider: EditableSearchProvider;
    let model: SearchDocumentModel;
    let view: SearchDocumentView;

    beforeEach(async () => {
      host = new Widget();
      provider = new EditableSearchProvider(host);
      model = new SearchDocumentModel(provider, 0);
      view = new SearchDocumentView(model);
      Widget.attach(view, document.body);
      await framePromise();
      await view.renderPromise;
    });

    afterEach(() => {
      view.dispose();
      host.dispose();
    });

    it('should tab from Find to Replace when replace is shown', async () => {
      view.showReplace();
      await framePromise();
      await view.renderPromise;

      const find = view.node.querySelector(
        '[placeholder="Find"]'
      ) as HTMLTextAreaElement;
      const replace = view.node.querySelector(
        '[placeholder="Replace"]'
      ) as HTMLTextAreaElement;
      const matchCase = view.node.querySelector(
        'button[title="Match Case"]'
      ) as HTMLButtonElement;

      expect(find).toBeTruthy();
      expect(replace).toBeTruthy();
      expect(matchCase).toBeTruthy();

      find.focus();
      expect(document.activeElement).toBe(find);

      find.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Tab',
          bubbles: true,
          cancelable: true
        })
      );
      expect(document.activeElement).toBe(replace);

      replace.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Tab',
          shiftKey: true,
          bubbles: true,
          cancelable: true
        })
      );
      expect(document.activeElement).toBe(find);

      replace.focus();
      replace.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Tab',
          bubbles: true,
          cancelable: true
        })
      );
      expect(document.activeElement).toBe(matchCase);
    });
  });
});
