import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ISettingRegistry
} from '@jupyterlab/coreutils';

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  JSONObject, JSONValue
} from '@phosphor/coreutils';

import {
  DisposableSet, IDisposable
} from '@phosphor/disposable';

import {
  Widget
} from '@phosphor/widgets'; 

import {
  ICommandPalette
} from '@jupyterlab/apputils';

/**
 * The default shortcuts extension.
 *
 * #### Notes
 * Shortcut values are stored in the setting system. The default values for each
 * shortcut are preset in the settings schema file of this extension.
 * Additionally, each shortcut can be individually set by the end user by
 * modifying its setting (either in the text editor or by modifying its
 * underlying JSON file).
 *
 * When setting shortcut selectors, there are two concepts to consider:
 * specificity and matchability. These two interact in sometimes
 * counterintuitive ways. Keyboard events are triggered from an element and
 * they propagate up the DOM until they reach the `documentElement` (`<body>`).
 *
 * When a registered shortcut sequence is fired, the shortcut manager checks
 * the node that fired the event and each of its ancestors until a node matches
 * one or more registered selectors. The *first* matching selector in the
 * chain of ancestors will invoke the shortcut handler and the traversal will
 * end at that point. If a node matches more than one selector, the handler for
 * whichever selector is more *specific* fires.
 * @see https://www.w3.org/TR/css3-selectors/#specificity
 *
 * The practical consequence of this is that a very broadly matching selector,
 * e.g. `'*'` or `'div'` may match and therefore invoke a handler *before* a
 * more specific selector. The most common pitfall is to use the universal
 * (`'*'`) selector. For almost any use case where a global keyboard shortcut is
 * required, using the `'body'` selector is more appropriate.
 */

 function displayShortcuts(id: string, settingReqistry: ISettingRegistry, widget: Widget) {
  let commandPairs : JSONObject;
  let currentDiv: HTMLDivElement;
  // Clear widget's HTML 
  widget.node.innerHTML = '';
  // Load the default keybindings
  settingReqistry.load(plugin.id)
  // Get the JSON object composite of user and default settings
  .then(setting => 
    commandPairs = setting.composite)
  // Get each command-shortcut pair from the JSON object and add it the widget's DOM as a div's content
  .then(commandPairs => 
    Object.keys(commandPairs).forEach(function(key) {
    currentDiv = document.createElement('div');
    currentDiv.innerHTML = key + ' : ' + commandPairs[key]['keys'];
    widget.node.appendChild(currentDiv);
    console.log(key + ' : ' + commandPairs[key]['keys']);
  }));
  widget.update();
 }

const plugin: JupyterLabPlugin<void> = {
  id: '@jupyterlab/jupyterlab-shortcutui:plugin',
  requires: [ISettingRegistry, ICommandPalette],
  activate: (app: JupyterLab, settingReqistry: ISettingRegistry, palette: ICommandPalette): void => {
    console.log('jupyterlab-shortcutui activated!');
    const { commands } = app;

    let widget: Widget = new Widget();
    widget.id = 'jupyterlab-shortcutui';
    widget.title.label = 'Shortcut UI';
    widget.title.closable = true;

    // Add an application command
    const command: string = 'shortcutui:open';
    app.commands.addCommand(command, {
      label: 'Shortcut UI',
      execute: () => {
        if (!widget.isAttached) {
          // Attach the widget to the main work area if it's not there
          app.shell.addToMainArea(widget);
        }
        // Activate the widget
        app.shell.activateById(widget.id);
      }
    }); 

    palette.addItem({command, category: 'AAA'});

    // Load command settings
    settingReqistry.load(plugin.id).then(settings => {
      Private.loadShortcuts(commands, settings.composite, plugin.id, settingReqistry, widget);
      settings.changed.connect(() => {
        Private.loadShortcuts(commands, settings.composite, plugin.id, settingReqistry, widget);
      });
    }).catch((reason: Error) => {
      console.error('Loading shortcut settings failed.', reason.message);
    });
},
autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;


/**
 * A namespace for private module data.
 */
namespace Private {
  /**
   * The internal collection of currently loaded shortcuts.
   */
  let disposables: IDisposable;

  /**
   * Load the keyboard shortcuts from settings.
   */
  export
  function loadShortcuts(commands: CommandRegistry, composite: JSONObject, id: string, settingReqistry: ISettingRegistry, widget: Widget): void {
    console.log('Changed shortcut!');
    if (disposables) {
      disposables.dispose();
    }
    disposables = Object.keys(composite).reduce((acc, val): DisposableSet => {
      const options = normalizeOptions(composite[val]);

      if (options) {
        acc.add(commands.addKeyBinding(options));
      }

      return acc;
    }, new DisposableSet());
    displayShortcuts(plugin.id, settingReqistry, widget);
  }

  /**
   * Normalize potential keyboard shortcut options.
   */
  function normalizeOptions(value: JSONValue | Partial<CommandRegistry.IKeyBindingOptions>): CommandRegistry.IKeyBindingOptions | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    const { isArray } = Array;
    const valid = 'command' in value &&
      'keys' in value &&
      'selector' in value &&
      isArray((value as Partial<CommandRegistry.IKeyBindingOptions>).keys);

    return valid ? value as CommandRegistry.IKeyBindingOptions : undefined;
  }
}
