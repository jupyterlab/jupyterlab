// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { simulate } from 'simulate-event';
import { Widget } from '@lumino/widgets';
import { PathNavigator } from '../src/pathnavigator';
import type { FileBrowserModel } from '../src/model';

const flushPromises = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 0));

// jsdom does not implement scrollIntoView.
Element.prototype.scrollIntoView = jest.fn();

const DIRS = ['alpha', 'beta', 'gamma'];

/**
 * Create a minimal mock of FileBrowserModel that satisfies PathNavigator.
 */
function mockModel(
  overrides: {
    path?: string;
    getResult?: Array<{ name: string; type: string }>;
  } = {}
): { model: FileBrowserModel; cdCalls: string[] } {
  const cdCalls: string[] = [];
  const getResult =
    overrides.getResult ?? DIRS.map(n => ({ name: n, type: 'directory' }));
  const model = {
    path: overrides.path ?? '',
    manager: {
      services: {
        contents: {
          localPath: (p: string) => p,
          get: async (_path: string, _opts: unknown) => ({
            type: 'directory',
            content: getResult
          })
        }
      }
    },
    cd: jest.fn(async (path: string) => {
      cdCalls.push(path);
    })
  } as unknown as FileBrowserModel;
  return { model, cdCalls };
}

function makeNavigator(
  overrides: {
    path?: string;
    getResult?: Array<{ name: string; type: string }>;
  } = {}
): {
  navigator: PathNavigator;
  cdCalls: string[];
  closedCount: { value: number };
} {
  const { model, cdCalls } = mockModel(overrides);
  const closedCount = { value: 0 };

  const navigator = new PathNavigator({ model });
  navigator.closed.connect(() => {
    closedCount.value++;
  });

  Widget.attach(navigator, document.body);

  return { navigator, cdCalls, closedCount };
}

function inputEl(navigator: PathNavigator): HTMLInputElement {
  return navigator.node.querySelector('input') as HTMLInputElement;
}

function suggestionItems(navigator: PathNavigator): HTMLElement[] {
  return Array.from(navigator.node.querySelectorAll('ul > *')) as HTMLElement[];
}

function keydown(el: HTMLElement, key: string): void {
  simulate(el, 'keydown', { key });
}

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

describe('PathNavigator', () => {
  describe('#constructor()', () => {
    it('should create a node with class jp-PathNavigator', () => {
      const { navigator } = makeNavigator();
      expect(navigator.node.classList.contains('jp-PathNavigator')).toBe(true);
    });
  });

  describe('#onAfterAttach() / #onBeforeDetach()', () => {
    it('should respond to input events after attach', () => {
      const { navigator } = makeNavigator();
      navigator.open();
      inputEl(navigator).value = 'my/path';
      keydown(inputEl(navigator), 'Enter');
      // navigator handled the keydown → close was called
      expect(makeNavigator().closedCount.value).toBe(0); // fresh instance untouched
    });

    it('should not respond to input events after detach', () => {
      const { navigator, closedCount } = makeNavigator();
      navigator.open();
      Widget.detach(navigator);
      keydown(inputEl(navigator), 'Escape');
      expect(closedCount.value).toBe(0);
    });
  });

  describe('#open()', () => {
    it('should prefill input with model path + /', () => {
      const { navigator } = makeNavigator({ path: 'some/path' });
      navigator.open();
      expect(inputEl(navigator).value).toBe('some/path/');
    });

    it('should leave input empty when model path is empty', () => {
      const { navigator } = makeNavigator({ path: '' });
      navigator.open();
      expect(inputEl(navigator).value).toBe('');
    });
  });

  describe('suggestions', () => {
    it('should render sorted directory suggestions', async () => {
      const { navigator } = makeNavigator();
      navigator.open();
      await flushPromises();
      const items = suggestionItems(navigator);
      expect(items.map(li => li.textContent)).toEqual([
        'alpha',
        'beta',
        'gamma'
      ]);
    });

    it('should filter suggestions by typed prefix', async () => {
      const { navigator } = makeNavigator();
      navigator.open();
      await flushPromises();
      inputEl(navigator).value = 'b';
      simulate(inputEl(navigator), 'input');
      await flushPromises();
      expect(suggestionItems(navigator).map(li => li.textContent)).toEqual([
        'beta'
      ]);
    });

    it('should show no suggestions when no match', async () => {
      const { navigator } = makeNavigator();
      navigator.open();
      await flushPromises();
      inputEl(navigator).value = 'zzz';
      simulate(inputEl(navigator), 'input');
      await flushPromises();
      expect(suggestionItems(navigator).length).toBe(0);
    });
  });

  describe('keyboard navigation', () => {
    it('should call model.cd and close on Enter', async () => {
      const { navigator, cdCalls, closedCount } = makeNavigator();
      navigator.open();
      inputEl(navigator).value = 'my/path';
      keydown(inputEl(navigator), 'Enter');
      await flushPromises();
      expect(cdCalls).toEqual(['/my/path']);
      expect(closedCount.value).toBe(1);
    });

    it('should close on Escape without navigating', () => {
      const { navigator, cdCalls, closedCount } = makeNavigator();
      navigator.open();
      keydown(inputEl(navigator), 'Escape');
      expect(cdCalls).toEqual([]);
      expect(closedCount.value).toBe(1);
    });

    it('should highlight first suggestion on ArrowDown', async () => {
      const { navigator } = makeNavigator();
      navigator.open();
      await flushPromises();
      keydown(inputEl(navigator), 'ArrowDown');
      const items = suggestionItems(navigator);
      expect(items[0].classList.contains('jp-mod-active')).toBe(true);
    });

    it('should wrap to last suggestion on ArrowUp from start', async () => {
      const { navigator } = makeNavigator();
      navigator.open();
      await flushPromises();
      keydown(inputEl(navigator), 'ArrowUp');
      const items = suggestionItems(navigator);
      expect(items[items.length - 1].classList.contains('jp-mod-active')).toBe(
        true
      );
    });

    it('should complete sole match on Tab', async () => {
      const { navigator } = makeNavigator();
      navigator.open();
      await flushPromises();
      inputEl(navigator).value = 'b';
      simulate(inputEl(navigator), 'input');
      await flushPromises();
      keydown(inputEl(navigator), 'Tab');
      expect(inputEl(navigator).value).toBe('beta/');
    });

    it('should complete longest common prefix on Tab with multiple matches', async () => {
      const { navigator } = makeNavigator({
        getResult: ['alpha', 'almond'].map(name => ({
          name,
          type: 'directory'
        }))
      });
      navigator.open();
      await flushPromises();
      keydown(inputEl(navigator), 'Tab');
      expect(inputEl(navigator).value).toBe('al');
    });
  });

  describe('suggestion mousedown', () => {
    it('should call model.cd and close', async () => {
      const { navigator, cdCalls, closedCount } = makeNavigator({
        getResult: [{ name: 'alpha', type: 'directory' }]
      });
      navigator.open();
      await flushPromises();
      const li = suggestionItems(navigator)[0];
      simulate(li, 'mousedown');
      await flushPromises();
      expect(cdCalls).toEqual(['/alpha']);
      expect(closedCount.value).toBe(1);
    });
  });

  describe('blur', () => {
    it('should close on input blur', () => {
      const { navigator, closedCount } = makeNavigator();
      navigator.open();
      simulate(inputEl(navigator), 'blur');
      expect(closedCount.value).toBe(1);
    });
  });
});
