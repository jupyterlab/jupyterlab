import {
  IAppShell, ICommandPalette, ICommandRegistry
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
  IFileBrowserWidget
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
    requires: [IAppShell, ICommandPalette, IFileBrowserWidget],
    create: (shell: IAppShell, palette: ICommandPalette, browser: IFileBrowserWidget) => {
      palette.title.text = 'Commands';
      shell.addToLeftArea(palette, { rank: 40 });
      shell.attach(document.body);
      window.addEventListener('resize', () => { shell.update(); });
      browser.title.text = 'Files';
      shell.addToLeftArea(browser, { rank: 40 });
    }
  });
}
