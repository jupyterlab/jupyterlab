// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Clipboard,
  ISessionContext,
  SessionContextDialogs
} from '@jupyterlab/apputils';
import { Cell, CodeCellModel } from '@jupyterlab/cells';
import { CodeEditorWrapper, IEditorServices } from '@jupyterlab/codeeditor';
import {
  CodeMirrorEditorFactory,
  CodeMirrorMimeTypeService,
  EditorExtensionRegistry,
  EditorLanguageRegistry,
  ybinding
} from '@jupyterlab/codemirror';
import { Context, DocumentRegistry } from '@jupyterlab/docregistry';
import { INotebookContent } from '@jupyterlab/nbformat';
import { RenderMimeRegistry } from '@jupyterlab/rendermime';
import {
  DEFAULT_OUTPUTS as TEST_OUTPUTS,
  defaultRenderMime as testRenderMime
} from '@jupyterlab/rendermime/lib/testutils';
import { ServiceManager } from '@jupyterlab/services';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { UUID } from '@lumino/coreutils';
import * as defaultContent from './default.json';
import { INotebookModel, NotebookModel } from './model';
import { NotebookModelFactory } from './modelfactory';
import { NotebookPanel } from './panel';
import { Notebook, StaticNotebook } from './widget';
import { NotebookHistory } from './history';
import { NotebookWidgetFactory } from './widgetfactory';

export const DEFAULT_CONTENT: INotebookContent = defaultContent;

/**
 * Create and initialize context for a notebook.
 */
export async function initNotebookContext(
  options: {
    path?: string;
    manager?: ServiceManager.IManager;
    startKernel?: boolean;
  } = {}
): Promise<Context<INotebookModel>> {
  const factory = Private.notebookFactory;
  const manager = options.manager || Private.getManager();
  const path = options.path || UUID.uuid4() + '.ipynb';
  console.debug(
    'Initializing notebook context for',
    path,
    'kernel:',
    options.startKernel
  );

  const startKernel =
    options.startKernel === undefined ? false : options.startKernel;
  await manager.ready;

  const context = new Context({
    sessionDialogs: new SessionContextDialogs(),
    manager,
    factory,
    path,
    kernelPreference: {
      shouldStart: startKernel,
      canStart: startKernel,
      shutdownOnDispose: true,
      name: manager.kernelspecs.specs?.default
    }
  });
  await context.initialize(true);

  if (startKernel) {
    await context.sessionContext.initialize();
    await context.sessionContext.session?.kernel?.info;
  }

  return context;
}

/**
 * The default notebook content.
 */

export namespace NBTestUtils {
  export const DEFAULT_OUTPUTS = TEST_OUTPUTS;

  export const defaultEditorConfig = { ...StaticNotebook.defaultEditorConfig };

  const editorServices: IEditorServices = (function () {
    const languages = new EditorLanguageRegistry();
    EditorLanguageRegistry.getDefaultLanguages()
      .filter(lang => ['Python'].includes(lang.name))
      .forEach(lang => {
        languages.addLanguage(lang);
      });
    const extensions = new EditorExtensionRegistry();
    EditorExtensionRegistry.getDefaultExtensions()
      .filter(ext => ['autoClosingBrackets'].includes(ext.name))
      .forEach(ext => {
        extensions.addExtension(ext);
      });
    extensions.addExtension({
      name: 'binding',
      factory: ({ model }) =>
        EditorExtensionRegistry.createImmutableExtension(
          ybinding({
            ytext: (model.sharedModel as any).ysource,
            undoManager: (model.sharedModel as any).undoManager ?? undefined
          })
        )
    });
    const factoryService = new CodeMirrorEditorFactory({
      languages,
      extensions
    });
    const mimeTypeService = new CodeMirrorMimeTypeService(languages);
    return {
      factoryService,
      mimeTypeService
    };
  })();

  export const editorFactory =
    editorServices.factoryService.newInlineEditor.bind(
      editorServices.factoryService
    );

  export const mimeTypeService = editorServices.mimeTypeService;

  /**
   * Get a copy of the default rendermime instance.
   */
  export function defaultRenderMime(): RenderMimeRegistry {
    return testRenderMime();
  }

  export const clipboard = Clipboard.getInstance();

  /**
   * Create a base cell content factory.
   */
  export function createBaseCellFactory(): Cell.IContentFactory {
    return new Cell.ContentFactory({ editorFactory });
  }

  /**
   * Create a new code cell content factory.
   */
  export function createCodeCellFactory(): Cell.IContentFactory {
    return new Cell.ContentFactory({ editorFactory });
  }

  /**
   * Create a cell editor widget.
   */
  export function createCellEditor(model?: CodeCellModel): CodeEditorWrapper {
    return new CodeEditorWrapper({
      model: model ?? new CodeCellModel(),
      factory: editorFactory
    });
  }

  /**
   * Create a default notebook content factory.
   */
  export function createNotebookFactory(): Notebook.IContentFactory {
    return new Notebook.ContentFactory({ editorFactory });
  }

  /**
   * Create a default notebook panel content factory.
   */
  export function createNotebookPanelFactory(): NotebookPanel.IContentFactory {
    return new NotebookPanel.ContentFactory({ editorFactory });
  }

  /**
   * Create a notebook widget.
   */
  export function createNotebook(sessionContext?: ISessionContext): Notebook {
    let history = sessionContext
      ? {
          kernelHistory: new NotebookHistory({ sessionContext: sessionContext })
        }
      : {};
    return new Notebook({
      rendermime: defaultRenderMime(),
      contentFactory: createNotebookFactory(),
      mimeTypeService,
      notebookConfig: {
        ...StaticNotebook.defaultNotebookConfig,
        windowingMode: 'none'
      },
      ...history
    });
  }

  /**
   * Create a notebook panel widget.
   */
  export function createNotebookPanel(
    context: Context<INotebookModel>
  ): NotebookPanel {
    return new NotebookPanel({
      content: createNotebook(context.sessionContext),
      context
    });
  }

  /**
   * Populate a notebook with default content.
   */
  export function populateNotebook(notebook: Notebook): void {
    const model = new NotebookModel();
    model.fromJSON(DEFAULT_CONTENT);
    notebook.model = model;
  }

  export function createNotebookWidgetFactory(
    toolbarFactory?: (widget: NotebookPanel) => DocumentRegistry.IToolbarItem[]
  ): NotebookWidgetFactory {
    return new NotebookWidgetFactory({
      name: 'notebook',
      fileTypes: ['notebook'],
      rendermime: defaultRenderMime(),
      toolbarFactory,
      contentFactory: createNotebookPanelFactory(),
      mimeTypeService: mimeTypeService,
      editorConfig: defaultEditorConfig
    });
  }

  /**
   * Create a context for a file.
   */
  export async function createMockContext(
    startKernel = false
  ): Promise<Context<INotebookModel>> {
    const path = UUID.uuid4() + '.txt';
    const manager = new ServiceManagerMock();
    const factory = new NotebookModelFactory({});

    const context = new Context({
      sessionDialogs: new SessionContextDialogs(),
      manager,
      factory,
      path,
      kernelPreference: {
        shouldStart: startKernel,
        canStart: startKernel,
        autoStartDefault: startKernel
      }
    });
    await context.initialize(true);
    await context.sessionContext.initialize();
    return context;
  }
}

/**
 * A namespace for private data.
 */
namespace Private {
  let manager: ServiceManager;

  export const notebookFactory = new NotebookModelFactory();

  /**
   * Get or create the service manager singleton.
   */
  export function getManager(): ServiceManager {
    if (!manager) {
      manager = new ServiceManager({ standby: 'never' });
    }
    return manager;
  }
}
