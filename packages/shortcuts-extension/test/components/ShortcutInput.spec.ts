/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { ShortcutInput } from '../../src/components/ShortcutInput';
import { IShortcutTarget } from '../../src/types';
import { nullTranslator } from '@jupyterlab/translation';
import { PromiseDelegate } from '@lumino/coreutils';
import { createRoot } from 'react-dom/client';

describe('@jupyterlab/shortcut-extension', () => {
  describe('ShortcutInput', () => {
    let shortcutInput: ShortcutInput;
    let addKeybinding: jest.Mock;
    let findConflictsFor: jest.Mock;
    let displayConflicts: jest.Mock;
    let toggleInput: jest.Mock;

    beforeEach(async () => {
      addKeybinding = jest.fn();
      findConflictsFor = jest.fn().mockReturnValue([]);
      displayConflicts = jest.fn();
      toggleInput = jest.fn();

      const mockProps = {
        addKeybinding,
        replaceKeybinding: jest.fn(),
        deleteKeybinding: jest.fn(),
        findConflictsFor,
        displayConflicts,
        toggleInput,
        shortcut: {
          id: 'test-id',
          command: 'test:command',
          keybindings: [],
          args: {},
          selector: 'body',
          category: 'test'
        } as IShortcutTarget,
        toSymbols: (value: string) => value,
        displayInput: true,
        placeholder: 'Enter shortcut',
        translator: nullTranslator
      };

      const ready = new PromiseDelegate<void>();
      const element = React.createElement(ShortcutInput, {
        ...mockProps,
        ref: element => {
          if (element) {
            shortcutInput = element;
            ready.resolve();
          }
        }
      });
      const rootElement = document.createElement('div');
      document.body.appendChild(rootElement);
      const root = createRoot(rootElement);
      root.render(element);
      await ready.promise;
    });

    it('should add a keybinding when Ctrl+A is pressed and submitted', async () => {
      // Create a mock keyboard event for Ctrl+A
      const mockEvent = {
        key: 'a',
        ctrlKey: true,
        preventDefault: jest.fn(),
        nativeEvent: {
          keyCode: 65,
          charCode: 0,
          which: 65,
          location: 0
        }
      } as unknown as React.KeyboardEvent;

      // Call handleInput directly and wait for state update
      shortcutInput.handleInput(mockEvent);
      await new Promise(resolve => setTimeout(resolve, 0));

      // Verify the state was updated correctly
      expect(shortcutInput.state.userInput).toBe('A');
      expect(shortcutInput.state.currentChain).toBe('A');
      expect(shortcutInput.state.keys).toEqual([]);
      expect(shortcutInput.state.isAvailable).toBe(true);

      // Call handleSubmit directly
      await shortcutInput.handleSubmit();
      await Promise.resolve();

      // Verify addKeybinding was called with the correct arguments
      expect(addKeybinding).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-id',
          command: 'test:command',
          selector: 'body',
          category: 'test'
        }),
        ['A']
      );

      // Verify toggleInput was called to hide the input
      expect(toggleInput).toHaveBeenCalled();
    });
  });
});
