// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { FileEditorSearchProvider } from '@jupyterlab/fileeditor';
import {
  CodeMirrorEditorFactory,
  CodeMirrorMimeTypeService,
  EditorExtensionRegistry,
  EditorLanguageRegistry,
  ybinding
} from '@jupyterlab/codemirror';
import {
  Context,
  DocumentRegistry,
  TextModelFactory
} from '@jupyterlab/docregistry';
import { FileEditor } from '@jupyterlab/fileeditor';
import { ServiceManager } from '@jupyterlab/services';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { UUID } from '@lumino/coreutils';
import { MainAreaWidget } from '@jupyterlab/apputils';

describe('@jupyterlab/fileeditor', () => {
  const modelFactory = new TextModelFactory();
  const languages = (() => {
    const registry = new EditorLanguageRegistry();
    EditorLanguageRegistry.getDefaultLanguages()
      .filter(language => ['Python'].includes(language.name))
      .forEach(language => {
        registry.addLanguage(language);
      });
    return registry;
  })();
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
  const factoryService = new CodeMirrorEditorFactory({ extensions, languages });
  const mimeTypeService = new CodeMirrorMimeTypeService(languages);
  let context: Context<DocumentRegistry.ICodeModel>;
  let manager: ServiceManager.IManager;

  beforeAll(() => {
    manager = new ServiceManagerMock();
    return manager.ready;
  });

  describe('FileEditorSearchProvider', () => {
    let widget: FileEditor;
    let provider: FileEditorSearchProvider;

    beforeEach(async () => {
      const path = UUID.uuid4() + '.py';
      context = new Context({ manager, factory: modelFactory, path });
      widget = new FileEditor({
        factory: options => factoryService.newDocumentEditor(options),
        mimeTypeService,
        context
      });
      provider = new FileEditorSearchProvider(
        new MainAreaWidget({ content: widget })
      );
      await context.initialize(true);
      await context.ready;
      widget.context.model.fromString('test test\ntest');
    });

    afterEach(() => {
      widget.dispose();
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

      it('should not focus the editor', async () => {
        await provider.startQuery(/test/, undefined);
        await provider.highlightNext();
        expect(widget.editor.hasFocus()).toBe(false);
      });

      it('should loop back to first match', async () => {
        widget.editor.setCursorPosition({ line: 1, column: 0 });
        await provider.startQuery(/test/, undefined);
        expect(provider.currentMatchIndex).toBe(2);
        await provider.highlightNext();
        expect(provider.currentMatchIndex).toBe(0);
        await provider.endQuery();
      });

      it('should do nothing if the document is empty', async () => {
        widget.context.model.fromString('');
        await provider.startQuery(/test/, undefined);
        await provider.highlightNext();
        expect(provider.currentMatchIndex).toBe(null);
        await provider.endQuery();
      });
    });

    describe('#highlightPrevious()', () => {
      it('should highlight previous match', async () => {
        widget.editor.setCursorPosition({ line: 1, column: 0 });
        await provider.startQuery(/tes/, undefined);
        expect(provider.currentMatchIndex).toBe(2);
        expect(widget.editor.getCursorPosition().line).toBe(1);
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
        widget.editor.setCursorPosition({ line: 1, column: 0 });
        await provider.startQuery(/tes/, undefined);
        expect(provider.currentMatchIndex).toBe(2);
        await provider.replaceCurrentMatch('bar');
        expect(widget.context.model.toString()).toBe('test test\nbart');
        await provider.endQuery();
      });

      it('should replace first match when editor is blurred', async () => {
        await provider.startQuery(/tes/, undefined);
        expect(provider.currentMatchIndex).toBe(0);
        await provider.replaceCurrentMatch('bar');
        expect(widget.context.model.toString()).toBe('bart test\ntest');
        await provider.endQuery();
      });

      it('should replace first match when editor is focused', async () => {
        widget.editor.focus();
        await provider.startQuery(/tes/, undefined);
        expect(provider.currentMatchIndex).toBe(0);
        await provider.replaceCurrentMatch('bar');
        expect(widget.context.model.toString()).toBe('bart test\ntest');
        await provider.endQuery();
      });
    });

    describe('#replaceAllMatches()', () => {
      it('should replace all matches', async () => {
        await provider.startQuery(/test/, undefined);
        await provider.replaceAllMatches('bar');
        expect(widget.context.model.toString()).toBe('bar bar\nbar');
        await provider.endQuery();
      });
    });
  });
});
