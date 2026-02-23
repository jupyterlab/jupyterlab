// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { simulate } from 'simulate-event';
import { PathNavigator } from '../src/pathnavigator';

const flushPromises = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 0));

// jsdom does not implement scrollIntoView.
Element.prototype.scrollIntoView = jest.fn();

const DIRS = ['alpha', 'beta', 'gamma'];

function makeNavigator(overrides: Partial<PathNavigator.IOptions> = {}): {
  navigator: PathNavigator;
  navigated: string[];
  counts: { activated: number; deactivated: number };
} {
  const navigated: string[] = [];
  const counts = { activated: 0, deactivated: 0 };

  const navigator = new PathNavigator({
    getCurrentPath: () => 'some/path',
    getDirectoryContents: async () =>
      DIRS.map(name => ({ name, type: 'directory' })),
    onNavigate: path => navigated.push(path),
    onActivate: () => counts.activated++,
    onDeactivate: () => counts.deactivated++,
    ...overrides
  });

  document.body.appendChild(navigator.node);
  navigator.attach();

  return { navigator, navigated, counts };
}

function triggerEl(navigator: PathNavigator): HTMLElement {
  return navigator.node.firstElementChild as HTMLElement;
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

    it('should not be active initially', () => {
      const { navigator } = makeNavigator();
      expect(navigator.isActive).toBe(false);
    });
  });

  describe('#attach() / #detach()', () => {
    it('should respond to trigger click after attach', () => {
      const { navigator, counts } = makeNavigator();
      simulate(triggerEl(navigator), 'click');
      expect(counts.activated).toBe(1);
    });

    it('should not respond to trigger click after detach', () => {
      const { navigator, counts } = makeNavigator();
      navigator.detach();
      simulate(triggerEl(navigator), 'click');
      expect(counts.activated).toBe(0);
    });
  });

  describe('trigger click', () => {
    it('should set isActive to true', () => {
      const { navigator } = makeNavigator();
      simulate(triggerEl(navigator), 'click');
      expect(navigator.isActive).toBe(true);
    });

    it('should call onActivate', () => {
      const { navigator, counts } = makeNavigator();
      simulate(triggerEl(navigator), 'click');
      expect(counts.activated).toBe(1);
    });

    it('should prefill input with current path + /', () => {
      const { navigator } = makeNavigator();
      simulate(triggerEl(navigator), 'click');
      expect(inputEl(navigator).value).toBe('some/path/');
    });

    it('should leave input empty when current path is empty', () => {
      const { navigator } = makeNavigator({ getCurrentPath: () => '' });
      simulate(triggerEl(navigator), 'click');
      expect(inputEl(navigator).value).toBe('');
    });
  });

  describe('suggestions', () => {
    it('should render sorted directory suggestions', async () => {
      const { navigator } = makeNavigator();
      simulate(triggerEl(navigator), 'click');
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
      simulate(triggerEl(navigator), 'click');
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
      simulate(triggerEl(navigator), 'click');
      await flushPromises();
      inputEl(navigator).value = 'some/path/zzz';
      simulate(inputEl(navigator), 'input');
      await flushPromises();
      expect(suggestionItems(navigator).length).toBe(0);
    });
  });

  describe('keyboard navigation', () => {
    it('should call onNavigate and deactivate on Enter', () => {
      const { navigator, navigated, counts } = makeNavigator();
      simulate(triggerEl(navigator), 'click');
      inputEl(navigator).value = 'my/path';
      keydown(inputEl(navigator), 'Enter');
      expect(navigated).toEqual(['my/path']);
      expect(counts.deactivated).toBe(1);
      expect(navigator.isActive).toBe(false);
    });

    it('should deactivate on Escape without navigating', () => {
      const { navigator, navigated, counts } = makeNavigator();
      simulate(triggerEl(navigator), 'click');
      keydown(inputEl(navigator), 'Escape');
      expect(navigated).toEqual([]);
      expect(counts.deactivated).toBe(1);
      expect(navigator.isActive).toBe(false);
    });

    it('should highlight first suggestion on ArrowDown', async () => {
      const { navigator } = makeNavigator();
      simulate(triggerEl(navigator), 'click');
      await flushPromises();
      keydown(inputEl(navigator), 'ArrowDown');
      const items = suggestionItems(navigator);
      expect(items[0].classList.contains('jp-mod-active')).toBe(true);
    });

    it('should wrap to last suggestion on ArrowUp from start', async () => {
      const { navigator } = makeNavigator();
      simulate(triggerEl(navigator), 'click');
      await flushPromises();
      keydown(inputEl(navigator), 'ArrowUp');
      const items = suggestionItems(navigator);
      expect(items[items.length - 1].classList.contains('jp-mod-active')).toBe(
        true
      );
    });

    it('should complete sole match on Tab', async () => {
      const { navigator } = makeNavigator();
      simulate(triggerEl(navigator), 'click');
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
      simulate(triggerEl(navigator), 'click');
      await flushPromises();
      keydown(inputEl(navigator), 'Tab');
      expect(inputEl(navigator).value).toBe('some/path/al');
    });
  });

  describe('suggestion mousedown', () => {
    it('should call onNavigate and deactivate', async () => {
      const { navigator, navigated, counts } = makeNavigator({
        getCurrentPath: () => ''
      });
      simulate(triggerEl(navigator), 'click');
      await flushPromises();
      const li = suggestionItems(navigator)[0];
      simulate(li, 'mousedown');
      expect(navigated).toEqual(['alpha']);
      expect(counts.deactivated).toBe(1);
      expect(navigator.isActive).toBe(false);
    });
  });

  describe('blur', () => {
    it('should deactivate on input blur', () => {
      const { navigator, counts } = makeNavigator();
      simulate(triggerEl(navigator), 'click');
      simulate(inputEl(navigator), 'blur');
      expect(counts.deactivated).toBe(1);
      expect(navigator.isActive).toBe(false);
    });
  });
});
