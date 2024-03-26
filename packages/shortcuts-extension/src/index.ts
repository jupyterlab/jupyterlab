// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module shortcuts-extension
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ISettingRegistry, SettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  IFormRenderer,
  IFormRendererRegistry
} from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import {
  JSONExt,
  PartialJSONValue,
  ReadonlyPartialJSONObject,
  ReadonlyPartialJSONValue
} from '@lumino/coreutils';
import { DisposableSet, IDisposable } from '@lumino/disposable';
import { Platform } from '@lumino/domutils';
import { CommandIDs, IShortcutsSettingsLayout, IShortcutUI } from './types';
import { renderShortCut } from './renderer';
import { ISignal, Signal } from '@lumino/signaling';

const SHORTCUT_PLUGIN_ID = '@jupyterlab/shortcuts-extension:shortcuts';

function getExternalForJupyterLab(
  settingRegistry: ISettingRegistry,
  app: JupyterFrontEnd,
  translator: ITranslator,
  actionRequested: ISignal<unknown, IShortcutUI.ActionRequest>
): IShortcutUI.IExternalBundle {
  return {
    translator,
    getSettings: () =>
      settingRegistry.load(SHORTCUT_PLUGIN_ID, true) as Promise<
        ISettingRegistry.ISettings<IShortcutsSettingsLayout>
      >,
    commandRegistry: app.commands,
    actionRequested
  };
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
const shortcuts: JupyterFrontEndPlugin<void> = {
  id: SHORTCUT_PLUGIN_ID,
  description: 'Adds the keyboard shortcuts editor.',
  requires: [ISettingRegistry],
  optional: [ITranslator, IFormRendererRegistry],
  activate: async (
    app: JupyterFrontEnd,
    registry: ISettingRegistry,
    translator: ITranslator | null,
    editorRegistry: IFormRendererRegistry | null
  ) => {
    const translator_ = translator ?? nullTranslator;
    const trans = translator_.load('jupyterlab');
    const { commands } = app;
    let canonical: ISettingRegistry.ISchema | null;
    // Stores initial value of the shortcuts `default` value,
    // which reflects the `overrides.json` contents.
    let cannonicalOverrides: PartialJSONValue | undefined;
    let loaded: { [name: string]: ISettingRegistry.IShortcut[] } = {};

    if (editorRegistry) {
      const actionRequested = new Signal<unknown, IShortcutUI.ActionRequest>(
        {}
      );
      const isKeybindingNode = (node: HTMLElement) =>
        node.dataset['shortcut'] !== undefined;

      app.commands.addCommand(CommandIDs.editBinding, {
        label: trans.__('Edit Keybinding'),
        caption: trans.__('Edit existing keybinding'),
        execute: () => {
          const node = app.contextMenuHitTest(isKeybindingNode);
          const keybinding = node?.dataset['keybinding'];
          const shortcutId = node?.dataset['shortcut'];
          if (!shortcutId || !keybinding) {
            return console.log('Missing shortcut id/keybinding information');
          }
          actionRequested.emit({
            request: 'edit-keybinding',
            keybinding: parseInt(keybinding, 10),
            shortcutId
          });
        }
      });

      app.commands.addCommand(CommandIDs.deleteBinding, {
        label: trans.__('Delete Keybinding'),
        caption: trans.__('Delete chosen keybinding'),
        execute: () => {
          const node = app.contextMenuHitTest(isKeybindingNode);
          const keybinding = node?.dataset['keybinding'];
          const shortcutId = node?.dataset['shortcut'];
          if (!shortcutId || !keybinding) {
            return console.log('Missing shortcut id/keybinding information');
          }
          actionRequested.emit({
            request: 'delete-keybinding',
            keybinding: parseInt(keybinding, 10),
            shortcutId
          });
        }
      });

      app.commands.addCommand(CommandIDs.addBinding, {
        label: trans.__('Add Keybinding'),
        caption: trans.__('Add new keybinding for existing shortcut target'),
        execute: () => {
          const node = app.contextMenuHitTest(isKeybindingNode);
          const shortcutId = node?.dataset['shortcut'];
          if (!shortcutId) {
            return console.log('Missing shortcut id to add keybinding to');
          }
          actionRequested.emit({
            request: 'add-keybinding',
            shortcutId
          });
        }
      });

      commands.addCommand(CommandIDs.toggleSelectors, {
        label: trans.__('Toggle Selectors'),
        caption: trans.__('Toggle command selectors'),
        execute: () => {
          actionRequested.emit({
            request: 'toggle-selectors'
          });
        }
      });

      commands.addCommand(CommandIDs.resetAll, {
        label: trans.__('Reset All'),
        caption: trans.__('Reset all shortcuts'),
        execute: () => {
          actionRequested.emit({
            request: 'reset-all'
          });
        }
      });

      const component: IFormRenderer = {
        fieldRenderer: (props: any) => {
          return renderShortCut({
            external: getExternalForJupyterLab(
              registry,
              app,
              translator_,
              actionRequested
            ),
            ...props
          });
        }
      };
      editorRegistry.addRenderer(`${shortcuts.id}.shortcuts`, component);
    }

    /**
     * Populate the plugin's schema defaults.
     */
    function populate(schema: ISettingRegistry.ISchema) {
      const commands = app.commands.listCommands().join('\n');
      if (!cannonicalOverrides) {
        cannonicalOverrides = JSONExt.deepCopy(
          schema.properties!.shortcuts.default!
        );
      }
      loaded = {};
      schema.properties!.shortcuts.default = Object.keys(registry.plugins)
        .map(plugin => {
          const shortcuts =
            registry.plugins[plugin]!.schema['jupyter.lab.shortcuts'] || [];
          loaded[plugin] = shortcuts;
          return shortcuts;
        })
        .concat([cannonicalOverrides as any[]])
        .reduce((acc, val) => {
          if (Platform.IS_MAC) {
            return acc.concat(val);
          } else {
            // If platform is not MacOS, remove all shortcuts containing Cmd
            // as they will be modified; e.g. `Cmd A` becomes `A`
            return acc.concat(
              val.filter(
                shortcut =>
                  !shortcut.keys.some(key => {
                    const { cmd } = CommandRegistry.parseKeystroke(key);
                    return cmd;
                  })
              )
            );
          }
        }, []) // flatten one level
        .sort((a, b) => a.command.localeCompare(b.command));

      schema.properties!.shortcuts.description = trans.__(
        `Note: To disable a system default shortcut,
copy it to User Preferences and add the
"disabled" key, for example:
{
    "command": "application:activate-next-tab",
    "keys": [
        "Ctrl Shift ]"
    ],
    "selector": "body",
    "disabled": true
}

List of commands followed by keyboard shortcuts:
%1

List of keyboard shortcuts:`,
        commands
      );
    }

    registry.pluginChanged.connect(async (_, plugin) => {
      if (plugin !== shortcuts.id) {
        // If the plugin changed its shortcuts, reload everything.
        const oldShortcuts = loaded[plugin];
        const newShortcuts =
          registry.plugins[plugin]!.schema['jupyter.lab.shortcuts'] || [];
        if (
          oldShortcuts === undefined ||
          !JSONExt.deepEqual(oldShortcuts, newShortcuts)
        ) {
          // Empty the default values to avoid shortcut collisions.
          canonical = null;
          const schema = registry.plugins[shortcuts.id]!.schema;
          schema.properties!.shortcuts.default = cannonicalOverrides;

          // Reload the settings.
          await registry.load(shortcuts.id, true);
        }
      }
    });

    // Transform the plugin object to return different schema than the default.
    registry.transform(shortcuts.id, {
      compose: plugin => {
        // Only override the canonical schema the first time.
        if (!canonical) {
          canonical = JSONExt.deepCopy(plugin.schema);
          populate(canonical);
        }

        const defaults = canonical.properties?.shortcuts?.default ?? [];
        const user = {
          shortcuts: plugin.data.user.shortcuts ?? []
        };
        const composite = {
          shortcuts: SettingRegistry.reconcileShortcuts(
            defaults as ISettingRegistry.IShortcut[],
            user.shortcuts as ISettingRegistry.IShortcut[]
          )
        };

        plugin.data = { composite, user };

        return plugin;
      },
      fetch: plugin => {
        // Only override the canonical schema the first time.
        if (!canonical) {
          canonical = JSONExt.deepCopy(plugin.schema);
          populate(canonical);
        }

        return {
          data: plugin.data,
          id: plugin.id,
          raw: plugin.raw,
          schema: canonical,
          version: plugin.version
        };
      }
    });

    try {
      // Repopulate the canonical variable after the setting registry has
      // preloaded all initial plugins.
      canonical = null;

      const settings = await registry.load(shortcuts.id);

      Private.loadShortcuts(commands, settings.composite);
      settings.changed.connect(() => {
        Private.loadShortcuts(commands, settings.composite);
      });
    } catch (error) {
      console.error(`Loading ${shortcuts.id} failed.`, error);
    }
  },
  autoStart: true
};

/**
 * Export the shortcut plugin as default.
 */
export default shortcuts;

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
  export function loadShortcuts(
    commands: CommandRegistry,
    composite: ReadonlyPartialJSONObject | undefined
  ): void {
    const shortcuts = (composite?.shortcuts ??
      []) as ISettingRegistry.IShortcut[];

    if (disposables) {
      disposables.dispose();
    }
    disposables = shortcuts.reduce((acc, val): DisposableSet => {
      const options = normalizeOptions(val);

      if (options) {
        acc.add(commands.addKeyBinding(options));
      }

      return acc;
    }, new DisposableSet());
  }

  /**
   * Normalize potential keyboard shortcut options.
   */
  function normalizeOptions(
    value:
      | ReadonlyPartialJSONValue
      | Partial<CommandRegistry.IKeyBindingOptions>
  ): CommandRegistry.IKeyBindingOptions | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    const { isArray } = Array;
    const valid =
      'command' in value &&
      'keys' in value &&
      'selector' in value &&
      isArray((value as Partial<CommandRegistry.IKeyBindingOptions>).keys);

    return valid ? (value as CommandRegistry.IKeyBindingOptions) : undefined;
  }
}
