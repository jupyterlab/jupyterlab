// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  COMPLETER_ENABLED_CLASS,
  COMPLETER_LINE_BEGINNING_CLASS
} from '@jupyterlab/codeeditor';
import {
  commandRegistry,
  hasKeyBinding,
  StateCommands
} from '@jupyterlab/codemirror';
import { CommandRegistry } from '@lumino/commands';
import type { IDisposable } from '@lumino/disposable';

/**
 * Selector of the default `completer:invoke-notebook` shortcut.
 */
const COMPLETER_SELECTOR =
  '.jp-Notebook .jp-mod-completer-enabled:not(.jp-mod-at-line-beginning)';

describe('@jupyterlab/codemirror', () => {
  let commands: CommandRegistry;
  let scope: HTMLElement;
  let host: HTMLElement;
  let views: EditorView[];

  function createView(
    options: {
      doc?: string;
      selection?: [number, number];
      registry?: boolean;
    } = {}
  ): EditorView {
    const { doc = 'foo', selection, registry = true } = options;
    const view = new EditorView({
      state: EditorState.create({
        doc,
        selection: selection
          ? EditorSelection.single(selection[0], selection[1])
          : EditorSelection.single(doc.length),
        extensions: registry ? [commandRegistry(commands)] : []
      }),
      parent: host
    });
    views.push(view);
    return view;
  }

  beforeEach(() => {
    commands = new CommandRegistry();
    commands.addCommand('test:invoke', { execute: () => undefined });
    scope = document.createElement('div');
    scope.className = 'jp-Notebook';
    host = document.createElement('div');
    scope.appendChild(host);
    document.body.appendChild(scope);
    views = [];
  });

  afterEach(() => {
    views.forEach(view => view.destroy());
    scope.remove();
  });

  describe('hasKeyBinding', () => {
    it('should be false without a command registry', () => {
      commands.addKeyBinding({
        command: 'test:invoke',
        keys: ['Tab'],
        selector: '.jp-Notebook'
      });
      expect(hasKeyBinding(createView({ registry: false }), 'Tab')).toBe(false);
    });

    it('should match a shortcut whose selector matches an ancestor of the content element', () => {
      const view = createView();
      expect(hasKeyBinding(view, 'Tab')).toBe(false);
      commands.addKeyBinding({
        command: 'test:invoke',
        keys: ['Tab'],
        selector: '.jp-Notebook'
      });
      expect(hasKeyBinding(view, 'Tab')).toBe(true);
    });

    it('should match a shortcut whose selector matches the content element', () => {
      commands.addKeyBinding({
        command: 'test:invoke',
        keys: ['Tab'],
        selector: '.cm-content'
      });
      expect(hasKeyBinding(createView(), 'Tab')).toBe(true);
    });

    it('should not match a shortcut for another context', () => {
      commands.addKeyBinding({
        command: 'test:invoke',
        keys: ['Tab'],
        selector: '.jp-FileEditor .cm-content'
      });
      expect(hasKeyBinding(createView(), 'Tab')).toBe(false);
    });

    it('should normalize the keystroke', () => {
      commands.addKeyBinding({
        command: 'test:invoke',
        keys: ['Accel Enter'],
        selector: '.jp-Notebook'
      });
      const view = createView();
      expect(hasKeyBinding(view, 'Accel Enter')).toBe(true);
      expect(hasKeyBinding(view, 'Enter')).toBe(false);
    });

    it('should not match a chord', () => {
      commands.addKeyBinding({
        command: 'test:invoke',
        keys: ['Tab', 'D'],
        selector: '.jp-Notebook'
      });
      expect(hasKeyBinding(createView(), 'Tab')).toBe(false);
    });

    it('should not match a disabled command', () => {
      let enabled = true;
      commands.addCommand('test:toggled', {
        execute: () => undefined,
        isEnabled: () => enabled
      });
      commands.addKeyBinding({
        command: 'test:toggled',
        keys: ['Tab'],
        selector: '.jp-Notebook'
      });
      const view = createView();
      expect(hasKeyBinding(view, 'Tab')).toBe(true);
      enabled = false;
      expect(hasKeyBinding(view, 'Tab')).toBe(false);
    });

    it('should not match below a node suppressing shortcuts', () => {
      commands.addKeyBinding({
        command: 'test:invoke',
        keys: ['Tab'],
        selector: '.jp-Notebook'
      });
      host.dataset.lmSuppressShortcuts = 'true';
      expect(hasKeyBinding(createView(), 'Tab')).toBe(false);
    });
  });

  describe('StateCommands', () => {
    describe('#indentMoreOrInsertTab', () => {
      let binding: IDisposable;

      beforeEach(() => {
        binding = commands.addKeyBinding({
          command: 'test:invoke',
          keys: ['Tab'],
          selector: COMPLETER_SELECTOR
        });
        host.classList.add(COMPLETER_ENABLED_CLASS);
      });

      it('should defer to a shortcut matching the editor', () => {
        const view = createView();
        expect(StateCommands.indentMoreOrInsertTab(view)).toBe(false);
        expect(view.state.doc.toString()).toBe('foo');
      });

      it('should insert a tab once the shortcut is removed', () => {
        binding.dispose();
        const view = createView();
        expect(StateCommands.indentMoreOrInsertTab(view)).toBe(true);
        expect(view.state.doc.toString()).toBe('foo\t');
      });

      it('should insert a tab when the shortcut selector does not match', () => {
        host.classList.remove(COMPLETER_ENABLED_CLASS);
        const view = createView();
        expect(StateCommands.indentMoreOrInsertTab(view)).toBe(true);
        expect(view.state.doc.toString()).toBe('foo\t');
      });

      it('should indent at the beginning of a line', () => {
        host.classList.add(COMPLETER_LINE_BEGINNING_CLASS);
        const view = createView({ doc: '' });
        expect(StateCommands.indentMoreOrInsertTab(view)).toBe(true);
        expect(view.state.doc.toString()).toMatch(/^\s+$/);
      });

      it('should indent a selection', () => {
        // The completer disables itself when there is a selection.
        host.classList.remove(COMPLETER_ENABLED_CLASS);
        const view = createView({ doc: 'foo\nbar', selection: [0, 7] });
        expect(StateCommands.indentMoreOrInsertTab(view)).toBe(true);
        expect(view.state.doc.toString()).toMatch(/^\s+foo\n\s+bar$/);
      });

      describe('without a command registry', () => {
        it('should defer when the editor could complete', () => {
          binding.dispose();
          const view = createView({ registry: false });
          expect(StateCommands.indentMoreOrInsertTab(view)).toBe(false);
          expect(view.state.doc.toString()).toBe('foo');
        });

        it('should insert a tab when the editor cannot complete', () => {
          host.classList.remove(COMPLETER_ENABLED_CLASS);
          const view = createView({ registry: false });
          expect(StateCommands.indentMoreOrInsertTab(view)).toBe(true);
          expect(view.state.doc.toString()).toBe('foo\t');
        });

        it('should indent at the beginning of a line', () => {
          host.classList.add(COMPLETER_LINE_BEGINNING_CLASS);
          const view = createView({ doc: '', registry: false });
          expect(StateCommands.indentMoreOrInsertTab(view)).toBe(true);
          expect(view.state.doc.toString()).toMatch(/^\s+$/);
        });
      });
    });
  });
});
