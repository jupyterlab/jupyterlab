// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IFilterBoxProps } from '@jupyterlab/ui-components';
import { FilterBox, fuzzySearch, ReactWidget } from '@jupyterlab/ui-components';
import { framePromise, simulate } from '@jupyterlab/testing';
import { Widget } from '@lumino/widgets';
import React from 'react';

describe('@jupyterlab/ui-components', () => {
  describe('fuzzySearch()', () => {
    // The search logic is in StringExt.matchSumOfDeltas, which is already
    // tested in the lumino package.
    it('should find an ASCII match in text', () => {
      const result = fuzzySearch('food', 'foo');
      expect(result).not.toBeNull();
    });

    it('should find an ASCII match in text with a space', () => {
      const result = fuzzySearch('fast food', 'foo');
      expect(result).not.toBeNull();
    });

    it('should fail to find an ASCII match in text', () => {
      const result = fuzzySearch('fast food', 'bar');
      expect(result).toBeNull();
    });

    it('should find a French match in text', () => {
      const result = fuzzySearch('Liberté, égalité, fraternité', 'erté');
      expect(result).not.toBeNull();
    });

    it('should fail to find a French match in text', () => {
      const result = fuzzySearch('Liberté, égalité, fraternité', 'ègal');
      expect(result).toBeNull();
    });

    // CJK = Chinese, Japanese, and Korean characters
    it('should find a CJK match in ASCII+CJK text', () => {
      const result = fuzzySearch('2测试', '测');
      expect(result).not.toBeNull();
    });

    it('should find a ASCII match in ASCII+CJK text', () => {
      const result = fuzzySearch('测试1.ipynb', '1');
      expect(result).not.toBeNull();
    });
  });

  describe('FilterBox', () => {
    let widget: Widget;
    const updateFilter = jest.fn();

    const render = async (props: Partial<IFilterBoxProps> = {}) => {
      widget = ReactWidget.create(
        <FilterBox updateFilter={updateFilter} {...props} />
      );
      Widget.attach(widget, document.body);
      for (let i = 0; i < 10 && !widget.node.querySelector('jp-search'); i++) {
        await framePromise();
      }
      return widget.node.querySelector('jp-search') as HTMLInputElement;
    };

    const type = async (search: HTMLInputElement, value: string) => {
      search.value = value;
      search.dispatchEvent(new Event('input', { bubbles: true }));
      await framePromise();
    };

    const options = () =>
      Array.from(widget.node.querySelectorAll('[role="option"]')).map(
        option => option.textContent
      );

    afterEach(() => {
      widget.dispose();
      updateFilter.mockClear();
    });

    it('should not show a list of suggestions by default', async () => {
      const search = await render();
      await type(search, 'perf');
      expect(widget.node.querySelector('[role="listbox"]')).toBeNull();
    });

    it('should show the suggestions for the query', async () => {
      const getSuggestions = jest.fn((query: string) =>
        query ? [{ label: `tag:${query}`, value: `tag:${query}` }] : []
      );
      const search = await render({ getSuggestions });
      expect(options()).toEqual([]);

      await type(search, 'perf');

      expect(getSuggestions).toHaveBeenLastCalledWith('perf');
      expect(options()).toEqual(['tag:perf']);
    });

    it('should set the query of a picked suggestion', async () => {
      const search = await render({
        getSuggestions: () => [
          { label: 'Performance', value: 'tag:performance' }
        ]
      });
      await type(search, 'perf');

      simulate(widget.node.querySelector('[role="option"]')!, 'click');
      await framePromise();

      expect(search.value).toBe('tag:performance');
      expect(updateFilter).toHaveBeenLastCalledWith(
        expect.any(Function),
        'tag:performance'
      );
      expect(options()).toEqual([]);
    });

    it('should pick a suggestion with the keyboard', async () => {
      const search = await render({
        getSuggestions: () => [
          { label: 'tag:a', value: 'tag:a' },
          { label: 'tag:b', value: 'tag:b' }
        ]
      });
      await type(search, 'tag');

      simulate(search, 'keydown', { key: 'ArrowDown', bubbles: true });
      const [first, second] = Array.from(
        widget.node.querySelectorAll<HTMLElement>('[role="option"]')
      );
      expect(document.activeElement).toBe(first);
      simulate(first, 'keydown', { key: 'ArrowDown', bubbles: true });
      expect(document.activeElement).toBe(second);
      simulate(second, 'keydown', { key: 'Enter', bubbles: true });
      await framePromise();

      expect(search.value).toBe('tag:b');
      expect(options()).toEqual([]);
    });

    it('should hide the suggestions on Escape', async () => {
      const search = await render({
        getSuggestions: () => [{ label: 'tag:a', value: 'tag:a' }]
      });
      await type(search, 'a');
      expect(options()).toEqual(['tag:a']);

      simulate(search, 'keydown', { key: 'Escape', bubbles: true });
      await framePromise();

      expect(options()).toEqual([]);
    });
  });
});
