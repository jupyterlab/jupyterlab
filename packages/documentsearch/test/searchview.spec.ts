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
  replaceOptionsSupport = { preserveCase: false };

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
      const replaceAll = Array.from(view.node.querySelectorAll('button')).find(
        button => button.textContent?.includes('Replace All')
      ) as HTMLButtonElement | undefined;
      const matchCase = view.node.querySelector(
        'button[title="Match Case"]'
      ) as HTMLButtonElement;

      expect(find).toBeTruthy();
      expect(replace).toBeTruthy();
      expect(replaceAll).toBeTruthy();
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

      replaceAll!.focus();
      replaceAll!.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Tab',
          bubbles: true,
          cancelable: true
        })
      );
      expect(document.activeElement).toBe(matchCase);
    });

    it('should not steal Ctrl+Tab from the Find field', async () => {
      view.showReplace();
      await framePromise();
      await view.renderPromise;

      const find = view.node.querySelector(
        '[placeholder="Find"]'
      ) as HTMLTextAreaElement;
      const replace = view.node.querySelector(
        '[placeholder="Replace"]'
      ) as HTMLTextAreaElement;

      find.focus();
      find.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Tab',
          ctrlKey: true,
          bubbles: true,
          cancelable: true
        })
      );
      expect(document.activeElement).toBe(find);
      expect(document.activeElement).not.toBe(replace);
    });

    it('should tab from Replace to Preserve Case when that option exists', async () => {
      provider.replaceOptionsSupport = { preserveCase: true };
      view.showReplace();
      await framePromise();
      await view.renderPromise;

      const find = view.node.querySelector(
        '[placeholder="Find"]'
      ) as HTMLTextAreaElement;
      const replace = view.node.querySelector(
        '[placeholder="Replace"]'
      ) as HTMLTextAreaElement;
      const preserveCase = view.node.querySelector(
        'button[title="Preserve Case"]'
      ) as HTMLButtonElement;

      expect(preserveCase).toBeTruthy();

      find.focus();
      find.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Tab',
          bubbles: true,
          cancelable: true
        })
      );
      expect(document.activeElement).toBe(replace);

      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true
      });
      replace.dispatchEvent(tabEvent);
      expect(tabEvent.defaultPrevented).toBe(false);
    });
  });
});
