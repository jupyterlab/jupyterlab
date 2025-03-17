/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { ShortcutInput } from '../../src/components/ShortcutInput';
import { IShortcutTarget } from '../../src/types';
import { nullTranslator } from '@jupyterlab/translation';
import '@testing-library/jest-dom';

describe('ShortcutInput', () => {
  let mockProps: any;

  beforeEach(() => {
    mockProps = {
      addKeybinding: jest.fn().mockResolvedValue(undefined),
      replaceKeybinding: jest.fn().mockResolvedValue(undefined),
      deleteKeybinding: jest.fn().mockResolvedValue(undefined),
      findConflictsFor: jest.fn().mockReturnValue([]),
      displayConflicts: jest.fn(),
      toggleInput: jest.fn(),
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
  });

  it('should add a basic keybinding', async () => {
    // Render component
    const { container } = render(<ShortcutInput {...mockProps} />);
    const input = container.querySelector('.jp-Shortcuts-Input') as HTMLDivElement;

    // Simulate pressing 'A' key
    await act(async () => {
      fireEvent.keyDown(input, {
        key: 'a',
        code: 'KeyA',
        keyCode: 65,
        charCode: 0,
        which: 65,
        location: 0,
        repeat: false,
        preventDefault: () => {},
        nativeEvent: { code: 'KeyA', keyCode: 65, charCode: 0, which: 65, location: 0 }
      });
    });

    // Wait for state updates
    await act(async () => {
      await Promise.resolve();
    });

    // Verify the displayed text shows "A"
    const text = container.querySelector('.jp-Shortcuts-InputText')!;
    expect(text.textContent).toBe('A');

    // Click submit button
    const submitButton = container.querySelector('.jp-Shortcuts-Submit') as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Verify addKeybinding was called with correct arguments
    expect(mockProps.addKeybinding).toHaveBeenCalledWith(
      mockProps.shortcut,
      ['A']
    );

    // Verify input was toggled off
    expect(mockProps.toggleInput).toHaveBeenCalled();
  });
});
