// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/*
import { WidgetTracker } from '@jupyterlab/apputils';
import {
  CodeMirrorEditorFactory,
  CodeMirrorMimeTypeService
} from '@jupyterlab/codemirror';
import { DocumentManager } from '@jupyterlab/docmanager';
import {
  DocumentRegistry,
  DocumentWidget,
  IDocumentWidget,
  TextModelFactory
} from '@jupyterlab/docregistry';
import { FileEditor, FileEditorFactory } from '@jupyterlab/fileeditor';
import {
  MarkdownDocument,
  MarkdownViewerFactory
} from '@jupyterlab/markdownviewer';
import {
  NotebookModelFactory,
  NotebookPanel,
  NotebookTracker,
  NotebookWidgetFactory
} from '@jupyterlab/notebook';
import { RenderMimeRegistry } from '@jupyterlab/rendermime';
import { ServiceManager } from '@jupyterlab/services';
import { defaultRenderMime, Mock, NBTestUtils } from '@jupyterlab/testutils';
import * as ToC from '@jupyterlab/toc';
import { UUID } from '@lumino/coreutils';

let manager: DocumentManager;
let tocWidget: ToC.TableOfContents;
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
        tocWidget = new ToC.TableOfContents({
          docmanager: manager,
          rendermime: new RenderMimeRegistry()
        });
        expect(tocWidget).toBeInstanceOf(ToC.TableOfContents);
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
      let notebookGenerator: ToC.ITableOfContentsRegistry.IGenerator<NotebookPanel>;
      let notebookWidget: NotebookPanel;

      it('should create a notebook generator', () => {
        notebookTracker = new NotebookTracker({
          namespace: 'notebook'
        });
        expect(() => {
          notebookGenerator = ToC.createNotebookGenerator(
            notebookTracker,
            tocWidget,
            NBTestUtils.defaultRenderMime().sanitizer
          );
        }).not.toThrow();
      });

      it('should add a notebook generator to the registry', () => {
        expect(() => {
          registry.add(notebookGenerator);
        }).not.toThrow();
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
        tocWidget.current = {
          widget: notebookWidget,
          generator: notebookGenerator
        };
        expect(tocWidget.current.widget).toBeInstanceOf(NotebookPanel);
      });
    });

    describe('Markdown Generator: IGenerator<IDocumentWidget<FileEditor>>', () => {
      let markdownTracker: WidgetTracker<IDocumentWidget<FileEditor>>;
      let markdownGenerator: ToC.ITableOfContentsRegistry.IGenerator<IDocumentWidget<
        FileEditor
      >>;
      let markdownWidget: IDocumentWidget<FileEditor>;

      it('should create a markdown generator', () => {
        markdownTracker = new WidgetTracker<IDocumentWidget<FileEditor>>({
          namespace: 'markdown'
        });
        expect(() => {
          markdownGenerator = ToC.createMarkdownGenerator(
            markdownTracker,
            tocWidget,
            NBTestUtils.defaultRenderMime().sanitizer
          );
        }).not.toThrow();
      });

      it('should add a markdown generator to the registry', () => {
        expect(() => {
          registry.add(markdownGenerator);
        }).not.toThrow();
      });

      it('should find the markdown generator', async () => {
        const path = UUID.uuid4() + '.md';
        const newMarkdownWidget = manager.createNew(path);
        expect(newMarkdownWidget).toBeInstanceOf(DocumentWidget);
        markdownWidget = newMarkdownWidget as IDocumentWidget<FileEditor>;
        await markdownTracker.add(markdownWidget);
        const foundMarkdownGenerator = registry.find(markdownWidget);
        expect(foundMarkdownGenerator).toBeDefined();
      });

      it('should change current', async () => {
        tocWidget.current = {
          widget: markdownWidget,
          generator: markdownGenerator
        };
        expect(tocWidget.current.widget).toBeInstanceOf(DocumentWidget);
      });
    });

    describe('Rendered Markdown Generator: IGenerator<MarkdownDocument>', () => {
      let markdownTracker: WidgetTracker<MarkdownDocument>;
      let markdownGenerator: ToC.ITableOfContentsRegistry.IGenerator<MarkdownDocument>;
      let markdownWidget: MarkdownDocument;

      it('should create a markdown generator', () => {
        markdownTracker = new WidgetTracker<MarkdownDocument>({
          namespace: 'markdownviewer-widget'
        });
        expect(() => {
          markdownGenerator = ToC.createRenderedMarkdownGenerator(
            markdownTracker,
            tocWidget,
            NBTestUtils.defaultRenderMime().sanitizer
          );
        }).not.toThrow();
      });

      it('should add a markdown generator to the registry', () => {
        expect(() => {
          registry.add(markdownGenerator);
        }).not.toThrow();
      });

      it('should find the markdown generator', async () => {
        const path = UUID.uuid4() + '.md';
        const newMarkdownWidget = manager.createNew(path, 'Markdown Preview');
        expect(newMarkdownWidget).toBeInstanceOf(MarkdownDocument);
        markdownWidget = newMarkdownWidget as MarkdownDocument;
        await markdownTracker.add(markdownWidget);
        const foundMarkdownGenerator = registry.find(markdownWidget);
        expect(foundMarkdownGenerator).toBeDefined();
      });

      it('should change current', async () => {
        tocWidget.current = {
          widget: markdownWidget,
          generator: markdownGenerator
        };
        expect(tocWidget.current.widget).toBeInstanceOf(MarkdownDocument);
      });
    });

    describe('Latex Generator: IGenerator<IDocumentWidget<FileEditor>>', () => {
      let latexTracker: WidgetTracker<IDocumentWidget<FileEditor>>;
      let latexGenerator: ToC.ITableOfContentsRegistry.IGenerator<IDocumentWidget<
        FileEditor
      >>;
      let latexWidget: IDocumentWidget<FileEditor>;

      it('should create a latex generator', () => {
        latexTracker = new WidgetTracker<IDocumentWidget<FileEditor>>({
          namespace: 'latex'
        });
        expect(() => {
          latexGenerator = ToC.createLatexGenerator(latexTracker);
        }).not.toThrow();
      });

      it('should add a latex generator to the registry', () => {
        expect(() => {
          registry.add(latexGenerator);
        }).not.toThrow();
      });

      it('should find the latex generator', async () => {
        const path = UUID.uuid4() + '.tex';
        const newLatexWidget = manager.createNew(path);
        expect(newLatexWidget).toBeInstanceOf(DocumentWidget);
        latexWidget = newLatexWidget as IDocumentWidget<FileEditor>;
        await latexTracker.add(latexWidget);
        const foundLatexGenerator = registry.find(latexWidget);
        expect(foundLatexGenerator).toBeDefined();
      });

      it('should change current', async () => {
        tocWidget.current = {
          widget: latexWidget,
          generator: latexGenerator
        };
        expect(tocWidget.current.widget).toBeInstanceOf(DocumentWidget);
      });
    });

    describe('Python Generator: IGenerator<IDocumentWidget<FileEditor>>', () => {
      let pythonTracker: WidgetTracker<IDocumentWidget<FileEditor>>;
      let pythonGenerator: ToC.ITableOfContentsRegistry.IGenerator<IDocumentWidget<
        FileEditor
      >>;
      let pythonWidget: IDocumentWidget<FileEditor>;

      it('should create a python generator', () => {
        pythonTracker = new WidgetTracker<IDocumentWidget<FileEditor>>({
          namespace: 'python'
        });
        expect(() => {
          pythonGenerator = ToC.createPythonGenerator(pythonTracker);
        }).not.toThrow();
      });

      it('should add a python generator to the registry', () => {
        expect(() => {
          registry.add(pythonGenerator);
        }).not.toThrow();
      });

      it('should find the python generator', async () => {
        const path = UUID.uuid4() + '.py';
        const newPythonWidget = manager.createNew(path);
        expect(newPythonWidget).toBeInstanceOf(DocumentWidget);
        pythonWidget = newPythonWidget as IDocumentWidget<FileEditor>;
        await pythonTracker.add(pythonWidget);
        const foundPythonGenerator = registry.find(pythonWidget);
        expect(foundPythonGenerator).toBeDefined();
      });

      it('should change current', async () => {
        tocWidget.current = {
          widget: pythonWidget,
          generator: pythonGenerator
        };
        expect(tocWidget.current.widget).toBeInstanceOf(DocumentWidget);
      });
    });
  });
});
*/
