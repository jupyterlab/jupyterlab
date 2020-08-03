// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

import {
  NotebookPanel,
  NotebookTracker,
  NotebookWidgetFactory,
  NotebookModelFactory
} from '@jupyterlab/notebook';
import { DocumentManager } from '@jupyterlab/docmanager';
import * as ToC from '@jupyterlab/toc';
import { RenderMimeRegistry } from '@jupyterlab/rendermime';
import { ServiceManager } from '@jupyterlab/services';
import {
  DocumentRegistry,
  TextModelFactory,
  IDocumentWidget,
  DocumentWidget
} from '@jupyterlab/docregistry';
import { UUID } from '@lumino/coreutils';
import {
  CodeMirrorEditorFactory,
  CodeMirrorMimeTypeService
} from '@jupyterlab/codemirror';

import { NBTestUtils, Mock, defaultRenderMime } from '@jupyterlab/testutils';
import { WidgetTracker } from '@jupyterlab/apputils';
import { FileEditor, FileEditorFactory } from '@jupyterlab/fileeditor';
import {
  MarkdownViewerFactory,
  MarkdownDocument
} from '@jupyterlab/markdownviewer';

let manager: DocumentManager;
let widget: ToC.TableOfContents;
let registry: DocumentRegistry;
let services: ServiceManager.IManager;
let factory: TextModelFactory;

beforeAll(async () => {
  jest.setTimeout(20000);
  const opener: DocumentManager.IWidgetOpener = {
    open: widget => {
      // no-op
    }
  };
  factory = new TextModelFactory();
  registry = new DocumentRegistry({
    textModelFactory: factory
  });
  const contentFactory = NBTestUtils.createNotebookPanelFactory();
  const notebookFactory = new NotebookModelFactory({});
  registry.addModelFactory(notebookFactory);
  registry.addWidgetFactory(
    new NotebookWidgetFactory({
      modelName: 'notebook',
      contentFactory,
      fileTypes: ['notebook'],
      rendermime: defaultRenderMime(),
      mimeTypeService: NBTestUtils.mimeTypeService,
      name: 'notebook'
    })
  );
  registry.addWidgetFactory(
    new FileEditorFactory({
      editorServices: {
        factoryService: new CodeMirrorEditorFactory(),
        mimeTypeService: new CodeMirrorMimeTypeService()
      },
      factoryOptions: {
        name: 'editor',
        fileTypes: ['*'],
        defaultFor: ['*']
      }
    })
  );
  registry.addWidgetFactory(
    new MarkdownViewerFactory({
      rendermime: defaultRenderMime(),
      name: 'Markdown Preview',
      primaryFileType: registry.getFileType('markdown'),
      fileTypes: ['markdown'],
      defaultRendered: []
    })
  );
  services = new Mock.ServiceManagerMock();
  manager = new DocumentManager({
    registry,
    opener,
    manager: services
  });
});

describe('@jupyterlab/toc', () => {
  describe('TableOfContents', () => {
    describe('#constructor', () => {
      it('should construct a new ToC widget', () => {
        widget = new ToC.TableOfContents({
          docmanager: manager,
          rendermime: new RenderMimeRegistry()
        });
        expect(widget).toBeInstanceOf(ToC.TableOfContents);
      });
    });
  });

  describe('TableOfContentsRegistry', () => {
    let registry: ToC.TableOfContentsRegistry;

    beforeAll(() => {
      registry = new ToC.TableOfContentsRegistry();
    });

    describe('Notebook Generator: IGenerator<NotebookPanel>', () => {
      let notebookTracker: NotebookTracker;
      let notebookGenerator: ToC.TableOfContentsRegistry.IGenerator<NotebookPanel>;
      let notebookWidget: NotebookPanel;

      it('should create a notebook generator', () => {
        notebookTracker = new NotebookTracker({
          namespace: 'notebook'
        });
        notebookGenerator = ToC.createNotebookGenerator(
          notebookTracker,
          widget,
          NBTestUtils.defaultRenderMime().sanitizer
        );
      });

      it('should add a notebook generator to the registry', () => {
        registry.add(notebookGenerator);
      });

      it('should find the notebook generator', async () => {
        const path = UUID.uuid4() + '.ipynb';
        const newNotebookWidget = manager.createNew(path, 'notebook');
        expect(newNotebookWidget).toBeInstanceOf(NotebookPanel);
        notebookWidget = newNotebookWidget as NotebookPanel;
        await notebookTracker.add(notebookWidget);
        const foundNotebookGenerator = registry.find(notebookWidget);
        expect(foundNotebookGenerator).toBeDefined();
      });

      it('should change current', async () => {
        widget.current = {
          widget: notebookWidget,
          generator: notebookGenerator
        };
      });
    });

    describe('Markdown Generator: IGenerator<IDocumentWidget<FileEditor>>', () => {
      let markdownTracker: WidgetTracker<IDocumentWidget<FileEditor>>;
      let markdownGenerator: ToC.TableOfContentsRegistry.IGenerator<IDocumentWidget<
        FileEditor
      >>;
      let markdownWidget: IDocumentWidget<FileEditor>;

      it('should create a markdown generator', () => {
        markdownTracker = new WidgetTracker<IDocumentWidget<FileEditor>>({
          namespace: 'markdown'
        });
        markdownGenerator = ToC.createMarkdownGenerator(
          markdownTracker,
          widget,
          NBTestUtils.defaultRenderMime().sanitizer
        );
      });

      it('should add a markdown generator to the registry', () => {
        registry.add(markdownGenerator);
      });

      it('should find the markdown generator', async () => {
        const path = UUID.uuid4() + '.md';
        const newMarkdownWidget = manager.createNew(path);
        expect(newMarkdownWidget).toBeInstanceOf(DocumentWidget);
        markdownWidget = newMarkdownWidget as IDocumentWidget<FileEditor>;
        await markdownTracker.add(markdownWidget);
        const foundNotebookGenerator = registry.find(markdownWidget);
        expect(foundNotebookGenerator).toBeDefined();
      });

      it('should change current', async () => {
        widget.current = {
          widget: markdownWidget,
          generator: markdownGenerator
        };
      });
    });

    describe('Rendered Markdown Generator: IGenerator<MarkdownDocument>', () => {
      let markdownTracker: WidgetTracker<MarkdownDocument>;
      let markdownGenerator: ToC.TableOfContentsRegistry.IGenerator<MarkdownDocument>;
      let markdownWidget: MarkdownDocument;

      it('should create a markdown generator', () => {
        markdownTracker = new WidgetTracker<MarkdownDocument>({
          namespace: 'markdownviewer-widget'
        });
        markdownGenerator = ToC.createRenderedMarkdownGenerator(
          markdownTracker,
          widget,
          NBTestUtils.defaultRenderMime().sanitizer
        );
      });

      it('should add a markdown generator to the registry', () => {
        registry.add(markdownGenerator);
      });

      it('should find the markdown generator', async () => {
        const path = UUID.uuid4() + '.md';
        const newMarkdownWidget = manager.createNew(path, 'Markdown Preview');
        expect(newMarkdownWidget).toBeInstanceOf(MarkdownDocument);
        markdownWidget = newMarkdownWidget as MarkdownDocument;
        await markdownTracker.add(markdownWidget);
        const foundNotebookGenerator = registry.find(markdownWidget);
        expect(foundNotebookGenerator).toBeDefined();
      });

      it('should change current', async () => {
        widget.current = {
          widget: markdownWidget,
          generator: markdownGenerator
        };
      });
    });
  });
});
