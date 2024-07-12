// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PageConfig, URLExt } from '@jupyterlab/coreutils';
(window as any).__webpack_public_path__ = URLExt.join(
  PageConfig.getBaseUrl(),
  'example/'
);

// Import style through JS file to deduplicate them.
import './style';

import { IYText } from '@jupyter/ydoc';
import {
  Toolbar as AppToolbar,
  CommandToolbarButton,
  SessionContextDialogs
} from '@jupyterlab/apputils';
import {
  CodeMirrorEditorFactory,
  CodeMirrorMimeTypeService,
  EditorExtensionRegistry,
  EditorLanguageRegistry,
  EditorThemeRegistry,
  ybinding
} from '@jupyterlab/codemirror';
import {
  Completer,
  CompleterModel,
  CompletionHandler,
  KernelCompleterProvider,
  ProviderReconciliator
} from '@jupyterlab/completer';
import { DocumentManager } from '@jupyterlab/docmanager';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { createMarkdownParser } from '@jupyterlab/markedparser-extension';
import { MathJaxTypesetter } from '@jupyterlab/mathjax-extension';
import {
  ExecutionIndicator,
  NotebookModelFactory,
  NotebookPanel,
  NotebookWidgetFactory,
  StaticNotebook,
  ToolbarItems
} from '@jupyterlab/notebook';
import {
  standardRendererFactories as initialFactories,
  RenderMimeRegistry
} from '@jupyterlab/rendermime';
import { ServiceManager } from '@jupyterlab/services';
import { Toolbar } from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { CommandPalette, SplitPanel, Widget } from '@lumino/widgets';

import { COMMAND_IDS, setupCommands } from './commands';

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

  const languages = new EditorLanguageRegistry();

  const rendermime = new RenderMimeRegistry({
    initialFactories: initialFactories,
    latexTypesetter: new MathJaxTypesetter(),
    markdownParser: createMarkdownParser(languages)
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
    const themes = new EditorThemeRegistry();
    EditorThemeRegistry.getDefaultThemes().forEach(theme => {
      themes.addTheme(theme);
    });
    const registry = new EditorExtensionRegistry();

    EditorExtensionRegistry.getDefaultExtensions({ themes }).forEach(
      extensionFactory => {
        registry.addExtension(extensionFactory);
      }
    );
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

  const sessionContextDialogs = new SessionContextDialogs();
  const toolbarFactory = (panel: NotebookPanel) =>
    [
      COMMAND_IDS.save,
      COMMAND_IDS.insert,
      COMMAND_IDS.deleteCell,
      COMMAND_IDS.cut,
      COMMAND_IDS.copy,
      COMMAND_IDS.paste,
      COMMAND_IDS.runAndAdvance,
      COMMAND_IDS.interrupt,
      COMMAND_IDS.restart,
      COMMAND_IDS.restartAndRun
    ]
      .map<DocumentRegistry.IToolbarItem>(id => ({
        name: id,
        widget: new CommandToolbarButton({
          commands,
          id,
          args: { toolbar: true }
        })
      }))
      .concat([
        { name: 'cellType', widget: ToolbarItems.createCellTypeItem(panel) },
        { name: 'spacer', widget: Toolbar.createSpacerItem() },
        {
          name: 'kernelName',
          widget: AppToolbar.createKernelNameItem(
            panel.sessionContext,
            sessionContextDialogs
          )
        },
        {
          name: 'executionProgress',
          widget: ExecutionIndicator.createExecutionIndicatorItem(panel)
        }
      ]);

  const wFactory = new NotebookWidgetFactory({
    name: 'Notebook',
    modelName: 'notebook',
    fileTypes: ['notebook'],
    defaultFor: ['notebook'],
    preferKernel: true,
    canStartKernel: true,
    rendermime,
    contentFactory,
    mimeTypeService,
    toolbarFactory,
    notebookConfig: {
      ...StaticNotebook.defaultNotebookConfig,
      windowingMode: 'none'
    }
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

  // Ensure Jupyter styling
  panel.addClass('jp-ThemedContainer');
  completer.addClass('jp-ThemedContainer');

  // Attach the panel to the DOM.
  Widget.attach(panel, document.body);
  Widget.attach(completer, document.body);

  // Handle resize events.
  window.addEventListener('resize', () => {
    panel.update();
  });

  setupCommands(commands, palette, nbWidget, handler, sessionContextDialogs);

  console.debug('Example started!');
}

window.addEventListener('load', main);
