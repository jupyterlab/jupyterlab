// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MainAreaWidget } from '@jupyterlab/apputils';
import {
  CodeMirrorEditor,
  CodeMirrorEditorFactory,
  EditorExtensionRegistry,
  EditorLanguageRegistry,
  ybinding
} from '@jupyterlab/codemirror';
import { JsonSettingEditor } from '../src/jsonsettingeditor';
import { SettingEditorSearchProvider } from '../src/searchprovider';
import { SettingRegistry } from '@jupyterlab/settingregistry';
import { StateDB } from '@jupyterlab/statedb';
import { CommandRegistry } from '@lumino/commands';
import { Widget } from '@lumino/widgets';
import { TestConnector } from './utils';

describe('@jupyterlab/settingeditor', () => {
  const extensions = (() => {
    const registry = new EditorExtensionRegistry();
    registry.addExtension({
      name: 'binding',
      factory: ({ model }) => {
        return EditorExtensionRegistry.createImmutableExtension(
          ybinding({
            ytext: (model.sharedModel as any).ysource,
            undoManager: (model.sharedModel as any).undoManager ?? undefined
          })
        );
      }
    });

    return registry;
  })();
  const factoryService = new CodeMirrorEditorFactory({
    extensions,
    languages: (() => {
      const registry = new EditorLanguageRegistry();
      EditorLanguageRegistry.getDefaultLanguages().forEach(language => {
        registry.addLanguage(language);
      });
      return registry;
    })()
  });

  describe('SettingEditorSearchProvider', () => {
    let editor: JsonSettingEditor;
    let panel: MainAreaWidget<JsonSettingEditor>;
    let provider: SettingEditorSearchProvider;

    beforeEach(() => {
      const registry = new SettingRegistry({ connector: new TestConnector() });
      editor = new JsonSettingEditor({
        commands: {
          registry: new CommandRegistry(),
          revert: 'settingeditor:revert',
          save: 'settingeditor:save'
        },
        editorFactory: options => factoryService.newInlineEditor(options),
        key: 'settingeditor',
        registry,
        state: new StateDB()
      });
      panel = new MainAreaWidget({ content: editor });
      provider = new SettingEditorSearchProvider(panel);
      editor.source.model.sharedModel.setSource('test test\ntest');
    });

    afterEach(() => {
      panel.dispose();
    });

    const focusDefaults = (): void => {
      const host = (editor.defaults as CodeMirrorEditor).host;
      host.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    };

    const focusUser = (): void => {
      const host = (editor.source as CodeMirrorEditor).host;
      host.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    };

    describe('#isApplicable()', () => {
      it('should apply to the Advanced Settings editor panel', () => {
        expect(SettingEditorSearchProvider.isApplicable(panel)).toBe(true);
      });

      it('should not apply to other widgets', () => {
        expect(SettingEditorSearchProvider.isApplicable(new Widget())).toBe(
          false
        );
      });

      it('should not apply to a panel with different content', () => {
        expect(
          SettingEditorSearchProvider.isApplicable(
            new MainAreaWidget({ content: new Widget() })
          )
        ).toBe(false);
      });
    });

    describe('#matchesCount', () => {
      it('should return number of matches', async () => {
        await provider.startQuery(/test/, undefined);
        expect(provider.matchesCount).toBe(3);
        await provider.startQuery(/t/, undefined);
        expect(provider.matchesCount).toBe(6);
      });

      it('should return matches from the defaults editor when it has focus', async () => {
        editor.defaults.model.sharedModel.setSource('foo foo\nfoo');
        focusDefaults();
        await provider.startQuery(/foo/, undefined);
        expect(provider.matchesCount).toBe(3);
        await provider.endQuery();
      });

      it('should switch to the user editor when it gains focus', async () => {
        editor.defaults.model.sharedModel.setSource('foo foo\nfoo');
        focusDefaults();
        await provider.startQuery(/foo/, undefined);
        expect(provider.matchesCount).toBe(3);
        await provider.endQuery();
        focusUser();
        await provider.startQuery(/test/, undefined);
        expect(provider.matchesCount).toBe(3);
        await provider.endQuery();
      });
    });

    describe('#getInitialQuery()', () => {
      it('should return the selection of the focused defaults editor', () => {
        editor.defaults.model.sharedModel.setSource('foo foo\nfoo');
        editor.defaults.setSelection({
          start: { line: 0, column: 0 },
          end: { line: 0, column: 3 }
        });
        focusDefaults();
        expect(provider.getInitialQuery()).toBe('foo');
      });
    });

    describe('#isReadOnly', () => {
      it('should be true when the defaults editor is active', async () => {
        editor.defaults.model.sharedModel.setSource('foo foo\nfoo');
        focusDefaults();
        await provider.startQuery(/foo/, undefined);
        expect(provider.isReadOnly).toBe(true);
        expect(provider.getCurrentMatch()?.readOnly).toBe(true);
        await provider.endQuery();
      });

      it('should be false when the user editor is active', async () => {
        focusUser();
        await provider.startQuery(/test/, undefined);
        expect(provider.isReadOnly).toBeFalsy();
        await provider.endQuery();
      });
    });

    describe('#highlightNext()', () => {
      it('should highlight next match', async () => {
        await provider.startQuery(/test/, undefined);
        expect(provider.currentMatchIndex).toBe(0);
        await provider.highlightNext();
        expect(provider.currentMatchIndex).toBe(1);
        await provider.highlightNext();
        expect(provider.currentMatchIndex).toBe(2);
        await provider.endQuery();
      });

      it('should find multi-line matches', async () => {
        await provider.startQuery(/est\nte/, undefined);
        await provider.highlightNext();
        expect(provider.currentMatchIndex).toBe(0);
        await provider.endQuery();
      });

      it('should loop back to first match', async () => {
        editor.source.setCursorPosition({ line: 1, column: 0 });
        await provider.startQuery(/test/, undefined);
        expect(provider.currentMatchIndex).toBe(2);
        await provider.highlightNext();
        expect(provider.currentMatchIndex).toBe(0);
        await provider.endQuery();
      });

      it('should do nothing if the document is empty', async () => {
        editor.source.model.sharedModel.setSource('');
        await provider.startQuery(/test/, undefined);
        await provider.highlightNext();
        expect(provider.currentMatchIndex).toBe(null);
        await provider.endQuery();
      });
    });

    describe('#highlightPrevious()', () => {
      it('should highlight previous match', async () => {
        editor.source.setCursorPosition({ line: 1, column: 0 });
        await provider.startQuery(/tes/, undefined);
        expect(provider.currentMatchIndex).toBe(2);
        await provider.highlightPrevious();
        expect(provider.currentMatchIndex).toBe(1);
        await provider.highlightPrevious();
        expect(provider.currentMatchIndex).toBe(0);
        await provider.endQuery();
      });

      it('should loop back to last match', async () => {
        await provider.startQuery(/test/, undefined);
        expect(provider.currentMatchIndex).toBe(0);
        await provider.highlightPrevious();
        expect(provider.currentMatchIndex).toBe(2);
        await provider.endQuery();
      });
    });

    describe('#replaceCurrentMatch()', () => {
      it('should replace highlighted match when editor is blurred', async () => {
        editor.source.setCursorPosition({ line: 1, column: 0 });
        await provider.startQuery(/tes/, undefined);
        expect(provider.currentMatchIndex).toBe(2);
        await provider.replaceCurrentMatch('bar');
        expect(editor.source.model.sharedModel.getSource()).toBe(
          'test test\nbart'
        );
        await provider.endQuery();
      });

      it('should replace first match when editor is blurred', async () => {
        await provider.startQuery(/tes/, undefined);
        expect(provider.currentMatchIndex).toBe(0);
        await provider.replaceCurrentMatch('bar');
        expect(editor.source.model.sharedModel.getSource()).toBe(
          'bart test\ntest'
        );
        await provider.endQuery();
      });

      it('should not replace a match in the defaults editor', async () => {
        editor.defaults.model.sharedModel.setSource('foo foo\nfoo');
        focusDefaults();
        await provider.startQuery(/foo/, undefined);
        expect(provider.isReadOnly).toBe(true);
        expect(await provider.replaceCurrentMatch('bar')).toBe(false);
        expect(editor.defaults.model.sharedModel.getSource()).toBe(
          'foo foo\nfoo'
        );
        await provider.endQuery();
      });
    });

    describe('#replaceAllMatches()', () => {
      it('should replace all matches', async () => {
        await provider.startQuery(/test/, undefined);
        await provider.replaceAllMatches('bar');
        expect(editor.source.model.sharedModel.getSource()).toBe(
          'bar bar\nbar'
        );
        await provider.endQuery();
      });

      it('should not replace matches in the defaults editor', async () => {
        editor.defaults.model.sharedModel.setSource('foo foo\nfoo');
        focusDefaults();
        await provider.startQuery(/foo/, undefined);
        expect(await provider.replaceAllMatches('bar')).toBe(false);
        expect(editor.defaults.model.sharedModel.getSource()).toBe(
          'foo foo\nfoo'
        );
        await provider.endQuery();
      });
    });
  });
});
