import {
  IAppShell, ICommandPalette, ICommandRegistry, IShortcutManager
} from 'phosphide';

import {
  CodeMirrorWidget
} from 'phosphor-codemirror';

import {
  Container, Token
} from 'phosphor-di';

import {
  Widget
} from 'phosphor-widget';

import {
  IFileBrowserWidget, SHORTCUTS
} from '../index';

/**
 * Register the plugin contributions.
 *
 * @param container - The di container for type registration.
 *
 * #### Notes
 * This is called automatically when the plugin is loaded.
 */
export
function resolve(container: Container): Promise<void> {
  return container.resolve({
    requires: [IAppShell, ICommandPalette, IFileBrowserWidget, IShortcutManager, ICommandRegistry],
    create: (shell: IAppShell, palette: ICommandPalette, browser: IFileBrowserWidget, shortcutManager: IShortcutManager, commandRegistry: ICommandRegistry) => {
      // Set up the command palette.
      palette.widget.title.text = 'Commands';
      palette.widget.id = 'command-palette';
      commandRegistry.add([
        {
          id: 'command-palette:activate',
          handler: () => {
            let id = palette.widget.id;
            commandRegistry.execute('appshell:activate-left', { id });
            commandRegistry.execute('command-palette:focus-input');
          }
        },
        {
          id: 'command-palette:deactivate',
          handler: () => {
            if (palette.widget.isAttached && palette.widget.isVisible) {
              commandRegistry.execute('appshell:collapse-left');
            }
          }
        }
      ]);
      palette.commandTriggered.connect(() => {
        commandRegistry.execute('command-palette:deactivate');
      });
      shell.addToLeftArea(palette.widget, { rank: 40 });
      // Set up the file browser.
      browser.title.text = 'Files';
      browser.id = 'file-browser';
      shell.addToLeftArea(browser, { rank: 40 });
      // Add the application keyboard shortcuts.
      shortcutManager.add(SHORTCUTS);
      // Attach the app shell to the DOM.
      shell.attach(document.body);
      window.addEventListener('resize', () => { shell.update(); });
    }
  });
}
