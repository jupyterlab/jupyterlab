// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { simulate } from 'simulate-event';
import { Widget } from '@lumino/widgets';
import { PathNavigator } from '../src/pathnavigator';

const flushPromises = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 0));

// jsdom does not implement scrollIntoView.
Element.prototype.scrollIntoView = jest.fn();

const DIRS = ['alpha', 'beta', 'gamma'];

function makeNavigator(overrides: Partial<PathNavigator.IOptions> = {}): {
  navigator: PathNavigator;
  navigated: string[];
  counts: { closed: number };
} {
  const navigated: string[] = [];
  const counts = { closed: 0 };

  const navigator = new PathNavigator({
    getDirectoryContents: async () =>
      DIRS.map(name => ({ name, type: 'directory' })),
    onNavigate: path => navigated.push(path),
    onClose: () => counts.closed++,
    ...overrides
  });

  Widget.attach(navigator, document.body);

  return { navigator, navigated, counts };
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
      navigator.open('some/path');
      inputEl(navigator).value = 'my/path';
      keydown(inputEl(navigator), 'Enter');
      // navigator handled the keydown → close was called
      expect(makeNavigator().counts.closed).toBe(0); // fresh instance untouched
    });

    it('should not respond to input events after detach', () => {
      const { navigator, counts } = makeNavigator();
      navigator.open('some/path');
      Widget.detach(navigator);
      keydown(inputEl(navigator), 'Escape');
      expect(counts.closed).toBe(0);
    });
  });

  describe('#open()', () => {
    it('should prefill input with currentPath + /', () => {
      const { navigator } = makeNavigator();
      navigator.open('some/path');
      expect(inputEl(navigator).value).toBe('some/path/');
    });

    it('should leave input empty when currentPath is empty', () => {
      const { navigator } = makeNavigator();
      navigator.open('');
      expect(inputEl(navigator).value).toBe('');
    });
  });

  describe('suggestions', () => {
    it('should render sorted directory suggestions', async () => {
      const { navigator } = makeNavigator();
      navigator.open('some/path');
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
      navigator.open('some/path');
      await flushPromises();
      inputEl(navigator).value = 'some/path/b';
      simulate(inputEl(navigator), 'input');
      await flushPromises();
      expect(suggestionItems(navigator).map(li => li.textContent)).toEqual([
        'beta'
      ]);
    });

    it('should show no suggestions when no match', async () => {
      const { navigator } = makeNavigator();
      navigator.open('some/path');
      await flushPromises();
      inputEl(navigator).value = 'some/path/zzz';
      simulate(inputEl(navigator), 'input');
      await flushPromises();
      expect(suggestionItems(navigator).length).toBe(0);
    });
  });

  describe('keyboard navigation', () => {
    it('should call onNavigate and close on Enter', () => {
      const { navigator, navigated, counts } = makeNavigator();
      navigator.open('some/path');
      inputEl(navigator).value = 'my/path';
      keydown(inputEl(navigator), 'Enter');
      expect(navigated).toEqual(['my/path']);
      expect(counts.closed).toBe(1);
    });

    it('should close on Escape without navigating', () => {
      const { navigator, navigated, counts } = makeNavigator();
      navigator.open('some/path');
      keydown(inputEl(navigator), 'Escape');
      expect(navigated).toEqual([]);
      expect(counts.closed).toBe(1);
    });

    it('should highlight first suggestion on ArrowDown', async () => {
      const { navigator } = makeNavigator();
      navigator.open('some/path');
      await flushPromises();
      keydown(inputEl(navigator), 'ArrowDown');
      const items = suggestionItems(navigator);
      expect(items[0].classList.contains('jp-mod-active')).toBe(true);
    });

    it('should wrap to last suggestion on ArrowUp from start', async () => {
      const { navigator } = makeNavigator();
      navigator.open('some/path');
      await flushPromises();
      keydown(inputEl(navigator), 'ArrowUp');
      const items = suggestionItems(navigator);
      expect(items[items.length - 1].classList.contains('jp-mod-active')).toBe(
        true
      );
    });

    it('should complete sole match on Tab', async () => {
      const { navigator } = makeNavigator();
      navigator.open('some/path');
      await flushPromises();
      inputEl(navigator).value = 'some/path/b';
      simulate(inputEl(navigator), 'input');
      await flushPromises();
      keydown(inputEl(navigator), 'Tab');
      expect(inputEl(navigator).value).toBe('some/path/beta/');
    });

    it('should complete longest common prefix on Tab with multiple matches', async () => {
      const { navigator } = makeNavigator({
        getDirectoryContents: async () =>
          ['alpha', 'almond'].map(name => ({ name, type: 'directory' }))
      });
      navigator.open('some/path');
      await flushPromises();
      keydown(inputEl(navigator), 'Tab');
      expect(inputEl(navigator).value).toBe('some/path/al');
    });
  });

  describe('suggestion mousedown', () => {
    it('should call onNavigate and close', async () => {
      const { navigator, navigated, counts } = makeNavigator({
        getDirectoryContents: async () => [{ name: 'alpha', type: 'directory' }]
      });
      navigator.open('');
      await flushPromises();
      const li = suggestionItems(navigator)[0];
      simulate(li, 'mousedown');
      expect(navigated).toEqual(['alpha']);
      expect(counts.closed).toBe(1);
    });
  });

  describe('blur', () => {
    it('should close on input blur', () => {
      const { navigator, counts } = makeNavigator();
      navigator.open('some/path');
      simulate(inputEl(navigator), 'blur');
      expect(counts.closed).toBe(1);
    });
  });
});
