// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PageConfig, URLExt } from '@jupyterlab/coreutils';
(window as any).__webpack_public_path__ = URLExt.join(
  PageConfig.getBaseUrl(),
  'example/'
);

// Import style through JS file to deduplicate them.
import './style';

import { CommandRegistry } from '@lumino/commands';

import { CommandPalette, SplitPanel, Widget } from '@lumino/widgets';

import { ServiceManager } from '@jupyterlab/services';

import {
  CodeMirrorEditorFactory,
  CodeMirrorMimeTypeService,
  EditorExtensionRegistry,
  EditorLanguageRegistry,
  EditorThemeRegistry,
  ybinding
} from '@jupyterlab/codemirror';

import { ConsolePanel } from '@jupyterlab/console';

import {
  standardRendererFactories as initialFactories,
  RenderMimeRegistry
} from '@jupyterlab/rendermime';

import {
  ITranslator,
  nullTranslator,
  TranslationManager
} from '@jupyterlab/translation';

import { IYText } from '@jupyter/ydoc';

async function main(): Promise<any> {
  const translator = new TranslationManager();
  await translator.fetch('default');
  const trans = translator.load('jupyterlab');

  console.debug(trans.__('in main'));
  let path = '';
  const query: { [key: string]: string } = Object.create(null);

  window.location.search
    .substr(1)
    .split('&')
    .forEach(item => {
      const pair = item.split('=');
      if (pair[0]) {
        query[pair[0]] = pair[1];
      }
    });

  if (query['path']) {
    path = query['path'];
  }

  const manager = new ServiceManager();
  void manager.ready.then(() => {
    startApp(path, manager, translator);
  });
}

/**
 * Start the application.
 */
function startApp(
  path: string,
  manager: ServiceManager.IManager,
  translator?: ITranslator
) {
  translator = translator || nullTranslator;
  const trans = translator.load('jupyterlab');

  console.debug(trans.__('starting app'));
  // Initialize the command registry with the key bindings.
  const commands = new CommandRegistry();

  // Setup the keydown listener for the document.
  document.addEventListener('keydown', event => {
    commands.processKeydownEvent(event);
  });

  const rendermime = new RenderMimeRegistry({ initialFactories });

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
  const mimeTypeService = new CodeMirrorMimeTypeService(languages);
  const editorFactory = factoryService.newInlineEditor;
  const contentFactory = new ConsolePanel.ContentFactory({ editorFactory });

  const consolePanel = new ConsolePanel({
    rendermime,
    manager,
    path,
    contentFactory,
    mimeTypeService
  });
  consolePanel.title.label = trans.__('Console');

  const palette = new CommandPalette({ commands });

  const panel = new SplitPanel();
  panel.id = 'main';
  panel.orientation = 'horizontal';
  panel.spacing = 0;
  SplitPanel.setStretch(palette, 0);
  SplitPanel.setStretch(consolePanel, 1);
  panel.addWidget(palette);
  panel.addWidget(consolePanel);

  // Ensure Jupyter styling
  panel.addClass('jp-ThemedContainer');

  // Attach the panel to the DOM.
  Widget.attach(panel, document.body);

  // Handle resize events.
  window.addEventListener('resize', () => {
    panel.update();
  });

  const selector = '.jp-ConsolePanel';
  const category = trans.__('Console');
  let command: string;

  // Add the commands.
  command = 'console:clear';
  commands.addCommand(command, {
    label: trans.__('Clear'),
    execute: () => {
      consolePanel.console.clear();
    }
  });
  palette.addItem({ command, category });

  command = 'console:execute';
  commands.addCommand(command, {
    label: trans.__('Execute Prompt'),
    execute: () => {
      return consolePanel.console.execute();
    }
  });
  palette.addItem({ command, category });
  commands.addKeyBinding({ command, selector, keys: ['Enter'] });

  command = 'console:execute-forced';
  commands.addCommand(command, {
    label: trans.__('Execute Cell (forced)'),
    execute: () => {
      return consolePanel.console.execute(true);
    }
  });
  palette.addItem({ command, category });
  commands.addKeyBinding({ command, selector, keys: ['Shift Enter'] });

  command = 'console:linebreak';
  commands.addCommand(command, {
    label: trans.__('Insert Line Break'),
    execute: () => {
      consolePanel.console.insertLinebreak();
    }
  });
  palette.addItem({ command, category });
  commands.addKeyBinding({ command, selector, keys: ['Ctrl Enter'] });

  console.debug(trans.__('Example started!'));
}

window.addEventListener('load', main);
