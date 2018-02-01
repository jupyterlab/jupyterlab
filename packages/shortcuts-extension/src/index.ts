// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  InstanceTracker
} from '@jupyterlab/apputils';

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


/**
 * The command IDs used by the shortcuts editor.
 */
namespace CommandIDs {
  export
  const open = 'shortcuts:open-editor';
}


/**
 * The default shortcuts extension.
 *
 * #### Notes
 * Shortcut values are stored in the setting system. The default values for each
 * shortcut are preset in the settings schema file of this extension.
 * Additionally, each shortcut can be individually set by the end user by
 * modifying its setting (either in the text editor or by modifying its
 * underlying JSON schema file).
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
const plugin: JupyterLabPlugin<void> = {
  id: '@jupyterlab/shortcuts-extension:plugin',
  requires: [ISettingRegistry],
  activate: (app: JupyterLab, registry: ISettingRegistry): void => {
    const { commands } = app;

    registry.load(plugin.id).then(settings => {
      Private.loadShortcuts(commands, settings.composite);
      settings.changed.connect(() => {
        Private.loadShortcuts(commands, settings.composite);
      });
    }).catch((reason: Error) => {
      console.error('Loading shortcut settings failed.', reason.message);
    });
  },
  autoStart: true
};


class ShortcutsEditor extends Widget {}


/**
 * The shortcuts editor plugin.
 */
const editor: JupyterLabPlugin<void> = {
  id: '@jupyterlab/shortcuts-extension:editor',
  activate: (app: JupyterLab): void => {
    const { commands, shell } = app;
    const namespace = 'shortcuts-editor';
    const tracker = new InstanceTracker<ShortcutsEditor>({ namespace });

    commands.addCommand(CommandIDs.open, {
      execute: () => {
        if (tracker.currentWidget) {
          shell.activateById(tracker.currentWidget.id);
          return;
        }

        const editor = new ShortcutsEditor({
          node: (div => {
            div.innerHTML = 'Shortcuts Editor';

            return div;
          })(document.createElement('div'))
        });

        tracker.add(editor);
        editor.id = namespace;
        editor.title.label = 'Shortcuts';
        editor.title.iconClass = 'jp-SettingsIcon';
        editor.title.closable = true;
        shell.addToRightArea(editor);
        shell.activateById(editor.id);
      },
      label: 'Shortcuts Editor'
    });
    commands.addKeyBinding({
      selector: 'body',
      keys: ['Shift /'],
      command: CommandIDs.open
    });
    console.log('shortcuts editor activated');
  },
  autoStart: true
};


/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [plugin, editor];

export default plugins;


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
  function loadShortcuts(commands: CommandRegistry, composite: JSONObject): void {
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
