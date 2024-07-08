// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PageConfig, URLExt } from '@jupyterlab/coreutils';
(window as any).__webpack_public_path__ = URLExt.join(
  PageConfig.getBaseUrl(),
  'example/'
);

// Import style through JS file to deduplicate them.
import './style';

import {
  Toolbar as AppToolbar,
  SessionContext,
  SessionContextDialogs
} from '@jupyterlab/apputils';
import {
  refreshIcon,
  stopIcon,
  Toolbar,
  ToolbarButton
} from '@jupyterlab/ui-components';

import { Cell, CodeCell, CodeCellModel } from '@jupyterlab/cells';

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

import {
  standardRendererFactories as initialFactories,
  RenderMimeRegistry
} from '@jupyterlab/rendermime';

import {
  KernelManager,
  KernelSpecManager,
  SessionManager
} from '@jupyterlab/services';

import { IYText } from '@jupyter/ydoc';

import { CommandRegistry } from '@lumino/commands';

import { BoxPanel, Widget } from '@lumino/widgets';

function main(): void {
  const kernelManager = new KernelManager();
  const specsManager = new KernelSpecManager();
  const sessionManager = new SessionManager({ kernelManager });
  const sessionContext = new SessionContext({
    kernelManager,
    sessionManager,
    specsManager,
    name: 'Example'
  });
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
  const languages = new EditorLanguageRegistry();
  EditorLanguageRegistry.getDefaultLanguages()
    .filter(language =>
      ['ipython', 'julia', 'python'].includes(language.name.toLowerCase())
    )
    .forEach(language => {
      languages.addLanguage(language);
    });

  const factoryService = new CodeMirrorEditorFactory({
    extensions: editorExtensions(),
    languages
  });
  const mimeService = new CodeMirrorMimeTypeService(languages);

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

  // Create the cell widget with a default rendermime instance.
  const rendermime = new RenderMimeRegistry({ initialFactories });

  const cellWidget = new CodeCell({
    contentFactory: new Cell.ContentFactory({
      editorFactory: factoryService.newInlineEditor.bind(factoryService)
    }),
    rendermime,
    model: new CodeCellModel()
  }).initializeState();

  // Handle the mimeType for the current kernel asynchronously.
  sessionContext.kernelChanged.connect(() => {
    void sessionContext.session?.kernel?.info.then(info => {
      const lang = info.language_info;
      const mimeTypes = mimeService.getMimeTypeByLanguage(lang);
      const mimeType =
        Array.isArray(mimeTypes) && mimeTypes.length !== 0
          ? mimeTypes[0]
          : mimeTypes;
      cellWidget.model.mimeType = mimeType;
    });
  });

  // Use the default kernel.
  sessionContext.kernelPreference = { autoStartDefault: true };

  // Set up a completer.
  const editor = cellWidget.editor;
  const model = new CompleterModel();
  const completer = new Completer({ editor, model });
  const timeout = 1000;
  const provider = new KernelCompleterProvider();
  const reconciliator = new ProviderReconciliator({
    context: { widget: cellWidget, editor, session: sessionContext.session },
    providers: [provider],
    timeout: timeout
  });
  const handler = new CompletionHandler({ completer, reconciliator });

  //sessionContext.session?.kernel.
  void sessionContext.ready.then(() => {
    const provider = new KernelCompleterProvider();
    handler.reconciliator = new ProviderReconciliator({
      context: { widget: cellWidget, editor, session: sessionContext.session },
      providers: [provider],
      timeout: timeout
    });
  });

  // Set the handler's editor.
  handler.editor = editor;

  // Hide the widget when it first loads.
  completer.hide();
  completer.addClass('jp-Completer-Cell');

  // Create a toolbar for the cell.
  const toolbar = new Toolbar();
  toolbar.addItem('spacer', Toolbar.createSpacerItem());
  toolbar.addItem(
    'interrupt',
    new ToolbarButton({
      icon: stopIcon,
      onClick: () => {
        void sessionContext.session?.kernel?.interrupt();
      },
      tooltip: 'Interrupt the kernel'
    })
  );
  const dialogs = new SessionContextDialogs();
  toolbar.addItem(
    'restart',
    new ToolbarButton({
      icon: refreshIcon,
      onClick: () => {
        void dialogs.restart(sessionContext);
      },
      tooltip: 'Restart the kernel'
    })
  );
  toolbar.addItem(
    'name',
    AppToolbar.createKernelNameItem(sessionContext, dialogs)
  );
  toolbar.addItem('status', AppToolbar.createKernelStatusItem(sessionContext));

  // Lay out the widgets.
  const panel = new BoxPanel();
  panel.id = 'main';
  panel.direction = 'top-to-bottom';
  panel.spacing = 0;
  panel.addWidget(toolbar);
  panel.addWidget(cellWidget);
  BoxPanel.setStretch(toolbar, 0);
  BoxPanel.setStretch(cellWidget, 1);

  // Ensure Jupyter styling
  panel.addClass('jp-ThemedContainer');
  completer.addClass('jp-ThemedContainer');
  // [optional] Enforce Jupyter styling on the full page
  document.body.classList.add('jp-ThemedContainer');

  // Attach the panel to the DOM.
  Widget.attach(panel, document.body);
  Widget.attach(completer, document.body);

  // Handle widget state.
  window.addEventListener('resize', () => {
    panel.update();
  });
  cellWidget.activate();

  // Add the commands.
  commands.addCommand('invoke:completer', {
    execute: () => {
      handler.invoke();
    }
  });
  commands.addCommand('run:cell', {
    execute: () => CodeCell.execute(cellWidget, sessionContext)
  });

  commands.addKeyBinding({
    selector: '.jp-InputArea-editor.jp-mod-completer-enabled',
    keys: ['Tab'],
    command: 'invoke:completer'
  });
  commands.addKeyBinding({
    selector: '.jp-InputArea-editor',
    keys: ['Shift Enter'],
    command: 'run:cell'
  });

  // Start up the kernel.
  void sessionContext.initialize().then(() => {
    console.debug('Example started!');
  });
}

window.addEventListener('load', main);
