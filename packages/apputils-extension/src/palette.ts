/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import type { ILayoutRestorer, JupyterFrontEnd } from '@jupyterlab/application';
import type { ICommandPalette, IPaletteItem } from '@jupyterlab/apputils';
import {
  ModalCommandPalette,
  RecentsCommandPalette
} from '@jupyterlab/apputils';
import type { ISettingRegistry } from '@jupyterlab/settingregistry';
import type { IStateDB } from '@jupyterlab/statedb';
import type { ITranslator } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import { CommandPaletteSvg, paletteIcon } from '@jupyterlab/ui-components';
import { find } from '@lumino/algorithm';
import { CommandRegistry } from '@lumino/commands';
import type { IDisposable } from '@lumino/disposable';
import { DisposableDelegate } from '@lumino/disposable';
import type { CommandPalette } from '@lumino/widgets';

/**
 * The command IDs used by the apputils extension.
 */
namespace CommandIDs {
  export const activate = 'apputils:activate-command-palette';

  export const clearRecents = 'apputils:clear-recent-commands';
}

const PALETTE_PLUGIN_ID = '@jupyterlab/apputils-extension:palette';

/**
 * The key used to store the recently executed commands in the state database.
 */
const RECENTS_STATE_KEY = 'command-palette:recents';

/**
 * A thin wrapper around the `CommandPalette` class to conform with the
 * JupyterLab interface for the application-wide command palette.
 */
export class Palette implements ICommandPalette {
  /**
   * Create a palette instance.
   */
  constructor(palette: CommandPalette, translator?: ITranslator) {
    this.translator = translator || nullTranslator;
    const trans = this.translator.load('jupyterlab');
    this._palette = palette;
    this._palette.title.label = '';
    this._palette.title.dataset = {
      ...this._palette.title.dataset,
      jpTabLabel: trans.__('Commands')
    };
    this._palette.title.caption = trans.__('Command Palette');
  }

  /**
   * The placeholder text of the command palette's search input.
   */
  set placeholder(placeholder: string) {
    this._palette.inputNode.placeholder = placeholder;
  }
  get placeholder(): string {
    return this._palette.inputNode.placeholder;
  }

  /**
   * Activate the command palette for user input.
   */
  activate(): void {
    this._palette.activate();
  }

  /**
   * Add a command item to the command palette.
   *
   * @param options - The options for creating the command item.
   *
   * @returns A disposable that will remove the item from the palette.
   */
  addItem(options: IPaletteItem): IDisposable {
    const item = this._palette.addItem(options as CommandPalette.IItemOptions);
    return new DisposableDelegate(() => {
      this._palette.removeItem(item);
    });
  }

  protected translator: ITranslator;
  private _palette: CommandPalette;
}

/**
 * A namespace for `Palette` statics.
 */
export namespace Palette {
  /**
   * Activate the command palette.
   */
  export function activate(
    app: JupyterFrontEnd,
    translator: ITranslator,
    settingRegistry: ISettingRegistry | null,
    state: IStateDB | null = null
  ): ICommandPalette {
    const { commands, shell } = app;
    const trans = translator.load('jupyterlab');
    const palette = Private.createPalette(app, translator);
    const modalPalette = new ModalCommandPalette({
      commandPalette: palette,
      restore: () => {
        const widget = app.shell.currentWidget;

        if (widget) {
          widget.activate();
        }
      }
    });
    let modal = false;

    palette.node.setAttribute('role', 'region');
    palette.node.setAttribute(
      'aria-label',
      trans.__('Command Palette Section')
    );
    shell.add(palette, 'left', { rank: 300, type: 'Command Palette' });
    let settingsApplied: Promise<void> = Promise.resolve();
    if (settingRegistry) {
      const loadSettings = settingRegistry.load(PALETTE_PLUGIN_ID);
      const updateSettings = (settings: ISettingRegistry.ISettings): void => {
        const newModal = settings.get('modal').composite as boolean;
        if (modal && !newModal) {
          palette.parent = null;
          modalPalette.detach();
          shell.add(palette, 'left', { rank: 300, type: 'Command Palette' });
        } else if (!modal && newModal) {
          palette.parent = null;
          modalPalette.palette = palette;
          palette.show();
          modalPalette.attach();
        }
        modal = newModal;
        palette.maxRecentCommands = settings.get('maxRecentCommands')
          .composite as number;
      };

      settingsApplied = Promise.all([loadSettings, app.restored])
        .then(([settings]) => {
          updateSettings(settings);
          settings.changed.connect(settings => {
            updateSettings(settings);
          });
        })
        .catch((reason: Error) => {
          console.error(reason.message);
        });
    }

    if (state) {
      // Restore the recently executed commands once the settings have been
      // applied, so that the restored history is not truncated by a
      // `maxRecentCommands` limit which is about to change.
      const restored = settingsApplied
        .then(() => state.fetch(RECENTS_STATE_KEY))
        .then(value => {
          const saved = (
            value as
              | { commands?: RecentsCommandPalette.IRecentCommand[] }
              | undefined
          )?.commands;
          if (Array.isArray(saved)) {
            // List the commands executed during this session first.
            palette.recentCommands = [...palette.recentCommands, ...saved];
          }
        })
        .catch((reason: Error) => {
          console.error(
            'Failed to restore the recently used commands.',
            reason
          );
        });

      // Save the history when it changes, once the restoration has completed
      // so that an early save cannot overwrite the stored history.
      palette.recentsChanged.connect(() => {
        void restored
          .then(() =>
            state.save(RECENTS_STATE_KEY, { commands: palette.recentCommands })
          )
          .catch((reason: Error) => {
            console.warn('Failed to save the recently used commands.', reason);
          });
      });
    }

    // Show the current palette shortcut in its title.
    const updatePaletteTitle = () => {
      const binding = find(
        app.commands.keyBindings,
        b => b.command === CommandIDs.activate
      );
      if (binding) {
        const ks = binding.keys.map(CommandRegistry.formatKeystroke).join(', ');
        palette.title.caption = trans.__('Commands (%1)', ks);
      } else {
        palette.title.caption = trans.__('Commands');
      }
    };
    updatePaletteTitle();
    app.commands.keyBindingChanged.connect(() => {
      updatePaletteTitle();
    });

    commands.addCommand(CommandIDs.activate, {
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      },
      execute: () => {
        if (modal) {
          modalPalette.activate();
        } else {
          shell.activateById(palette.id);
        }
      },
      label: trans.__('Activate Command Palette')
    });

    commands.addCommand(CommandIDs.clearRecents, {
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      },
      execute: () => {
        palette.recentCommands = [];
      },
      isEnabled: () => palette.recentCommands.length > 0,
      label: trans.__('Clear Recently Used Commands'),
      caption: trans.__('Clear the list of recently used commands.')
    });
    palette.addItem({
      command: CommandIDs.clearRecents,
      category: trans.__('Command Palette')
    });

    // Keep the enabled state of the clear command up to date.
    palette.recentsChanged.connect(() => {
      commands.notifyCommandChanged(CommandIDs.clearRecents);
    });

    palette.inputNode.placeholder = trans.__('SEARCH');

    return new Palette(palette, translator);
  }

  /**
   * Restore the command palette.
   */
  export function restore(
    app: JupyterFrontEnd,
    restorer: ILayoutRestorer,
    translator: ITranslator
  ): void {
    const palette = Private.createPalette(app, translator);
    // Let the application restorer track the command palette for restoration of
    // application state (e.g. setting the command palette as the current side bar
    // widget).
    restorer.add(palette, 'command-palette');
  }
}

/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * The private command palette instance.
   */
  let palette: RecentsCommandPalette;

  /**
   * Create the application-wide command palette.
   */
  export function createPalette(
    app: JupyterFrontEnd,
    translator: ITranslator
  ): RecentsCommandPalette {
    if (!palette) {
      // use a renderer tweaked to use inline svg icons and to display a
      // badge for the recently executed commands
      palette = new RecentsCommandPalette({
        commands: app.commands,
        renderer: new CommandPaletteSvg.Renderer({
          translator,
          isRecent: item => palette.isRecent(item)
        })
      });
      palette.id = 'command-palette';
      palette.title.icon = paletteIcon;
    }

    return palette;
  }
}
