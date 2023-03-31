// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PageConfig, URLExt } from '@jupyterlab/coreutils';
(window as any).__webpack_public_path__ = URLExt.join(
  PageConfig.getBaseUrl(),
  'example/'
);

import '@jupyterlab/application/style/index.css';
import '@jupyterlab/codemirror/style/index.css';
import '@jupyterlab/completer/style/index.css';
import '@jupyterlab/documentsearch/style/index.css';
import '@jupyterlab/notebook/style/index.css';
import '@jupyterlab/theme-light-extension/style/theme.css';
import '../index.css';

import { ServiceManager } from '@jupyterlab/services';
import { MathJaxTypesetter } from '@jupyterlab/mathjax-extension';

import {
  NotebookModelFactory,
  NotebookPanel,
  NotebookWidgetFactory
} from '@jupyterlab/notebook';

import {
  Completer,
  CompleterModel,
  CompletionHandler,
  KernelCompleterProvider,
  ProviderReconciliator
} from '@jupyterlab/completer';

import {
  CodeMirrorEditorFactory,
  CodeMirrorMimeTypeService,
  EditorExtensionRegistry,
  EditorLanguageRegistry,
  ybinding
} from '@jupyterlab/codemirror';

import { DocumentManager } from '@jupyterlab/docmanager';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import {
  standardRendererFactories as initialFactories,
  RenderMimeRegistry
} from '@jupyterlab/rendermime';

import { IYText } from '@jupyter/ydoc';

import { CommandRegistry } from '@lumino/commands';

import { CommandPalette, SplitPanel, Widget } from '@lumino/widgets';

import { SetupCommands } from './commands';

function main(): void {
  const manager = new ServiceManager();
  void manager.ready.then(() => {
    createApp(manager);
  });
}

function createApp(manager: ServiceManager.IManager): void {
  // Initialize the command registry with the bindings.
  const commands = new CommandRegistry();
  const useCapture = true;

  // Setup the keydown listener for the document.
  document.addEventListener(
    'keydown',
    event => {
      commands.processKeydownEvent(event);
    },
    useCapture
  );

  const rendermime = new RenderMimeRegistry({
    initialFactories: initialFactories,
    latexTypesetter: new MathJaxTypesetter()
  });

  const opener = {
    open: (widget: Widget) => {
      // Do nothing for sibling widgets for now.
    },
    get opened() {
      return {
        connect: () => {
          return false;
        },
        disconnect: () => {
          return false;
        }
      };
    }
  };

  const docRegistry = new DocumentRegistry();
  const docManager = new DocumentManager({
    registry: docRegistry,
    manager,
    opener
  });
  const mFactory = new NotebookModelFactory({});
  const editorExtensions = () => {
    const registry = new EditorExtensionRegistry();
    for (const extensionFactory of EditorExtensionRegistry.getDefaultExtensions(
      {}
    )) {
      registry.addExtension(extensionFactory);
    }
    registry.addExtension({
      name: 'shared-model-binding',
      factory: options => {
        const sharedModel = options.model.sharedModel as IYText;
        return EditorExtensionRegistry.createImmutableExtension(
          ybinding({
            ytext: sharedModel.ysource,
            undoManager: sharedModel.undoManager ?? undefined
          })
        );
      }
    });
    return registry;
  };
  const languages = new EditorLanguageRegistry();
  EditorLanguageRegistry.getDefaultLanguages()
    .filter(language =>
      ['ipython', 'julia', 'python'].includes(language.name.toLowerCase())
    )
    .forEach(language => {
      languages.addLanguage(language);
    });
  // Language for Markdown cells
  languages.addLanguage({
    name: 'ipythongfm',
    mime: 'text/x-ipythongfm',
    load: async () => {
      const m = await import('@codemirror/lang-markdown');
      return m.markdown({
        codeLanguages: (info: string) => languages.findBest(info) as any
      });
    }
  });
  const factoryService = new CodeMirrorEditorFactory({
    extensions: editorExtensions(),
    languages
  });
  const mimeTypeService = new CodeMirrorMimeTypeService(languages);
  const editorFactory = factoryService.newInlineEditor;
  const contentFactory = new NotebookPanel.ContentFactory({ editorFactory });

  const wFactory = new NotebookWidgetFactory({
    name: 'Notebook',
    modelName: 'notebook',
    fileTypes: ['notebook'],
    defaultFor: ['notebook'],
    preferKernel: true,
    canStartKernel: true,
    rendermime,
    contentFactory,
    mimeTypeService
  });
  docRegistry.addModelFactory(mFactory);
  docRegistry.addWidgetFactory(wFactory);

  const notebookPath = PageConfig.getOption('notebookPath');
  const nbWidget = docManager.open(notebookPath) as NotebookPanel;
  const palette = new CommandPalette({ commands });
  palette.addClass('notebookCommandPalette');

  const editor =
    nbWidget.content.activeCell && nbWidget.content.activeCell.editor;
  const model = new CompleterModel();
  const completer = new Completer({ editor, model });
  const sessionContext = nbWidget.context.sessionContext;
  const timeout = 1000;
  const provider = new KernelCompleterProvider();
  const reconciliator = new ProviderReconciliator({
    context: { widget: nbWidget, editor, session: sessionContext.session },
    providers: [provider],
    timeout: timeout
  });
  const handler = new CompletionHandler({ completer, reconciliator });

  void sessionContext.ready.then(() => {
    const provider = new KernelCompleterProvider();
    const reconciliator = new ProviderReconciliator({
      context: { widget: nbWidget, editor, session: sessionContext.session },
      providers: [provider],
      timeout: timeout
    });

    handler.reconciliator = reconciliator;
  });

  // Set the handler's editor.
  handler.editor = editor;

  // Listen for active cell changes.
  nbWidget.content.activeCellChanged.connect((sender, cell) => {
    handler.editor = cell && cell.editor;
  });

  // Hide the widget when it first loads.
  completer.hide();

  const panel = new SplitPanel();
  panel.id = 'main';
  panel.orientation = 'horizontal';
  panel.spacing = 0;
  SplitPanel.setStretch(palette, 0);
  SplitPanel.setStretch(nbWidget, 1);
  panel.addWidget(palette);
  panel.addWidget(nbWidget);

  // Attach the panel to the DOM.
  Widget.attach(panel, document.body);
  Widget.attach(completer, document.body);

  // Handle resize events.
  window.addEventListener('resize', () => {
    panel.update();
  });

  SetupCommands(commands, palette, nbWidget, handler);

  console.debug('Example started!');
}

window.addEventListener('load', main);
