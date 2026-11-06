// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MainAreaWidget } from '@jupyterlab/apputils';
import {
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
    });
  });
});
