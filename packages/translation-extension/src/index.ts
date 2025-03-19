/* ----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module translation-extension
 */

import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Dialog, ICommandPalette, showDialog } from '@jupyterlab/apputils';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  ITranslator,
  ITranslatorConnector,
  TranslationManager,
  TranslatorConnector
} from '@jupyterlab/translation';

/**
 * Translation plugins
 */
const PLUGIN_ID = '@jupyterlab/translation-extension:plugin';

/**
 * Provide the translator connector as a separate plugin to allow for alternative
 * implementations that may want to fetch translation bundles from a different
 * source or endpoint.
 */
const translatorConnector: JupyterFrontEndPlugin<ITranslatorConnector> = {
  id: '@jupyterlab/translation-extension:translator-connector',
  description: 'Provides the application translation connector.',
  autoStart: true,
  requires: [JupyterFrontEnd.IPaths],
  provides: ITranslatorConnector,
  activate: (app: JupyterFrontEnd, paths: JupyterFrontEnd.IPaths) => {
    const url = paths.urls.translations;
    const serverSettings = app.serviceManager.serverSettings;
    return new TranslatorConnector(url, serverSettings);
  }
};

/**
 * The main translator plugin.
 */
const translator: JupyterFrontEndPlugin<ITranslator> = {
  id: '@jupyterlab/translation-extension:translator',
  description: 'Provides the application translation object.',
  autoStart: true,
  requires: [JupyterFrontEnd.IPaths, ISettingRegistry],
  optional: [ILabShell, ITranslatorConnector],
  provides: ITranslator,
  activate: async (
    app: JupyterFrontEnd,
    paths: JupyterFrontEnd.IPaths,
    settings: ISettingRegistry,
    labShell: ILabShell | null,
    connector: ITranslatorConnector | null
  ) => {
    const setting = await settings.load(PLUGIN_ID);
    const currentLocale: string = setting.get('locale').composite as string;
    let stringsPrefix: string = setting.get('stringsPrefix')
      .composite as string;
    const displayStringsPrefix: boolean = setting.get('displayStringsPrefix')
      .composite as boolean;
    stringsPrefix = displayStringsPrefix ? stringsPrefix : '';
    const serverSettings = app.serviceManager.serverSettings;
    const translationManager = new TranslationManager(
      paths.urls.translations,
      stringsPrefix,
      serverSettings,
      connector ?? undefined
    );
    // As we wait for fetching the translation, ITranslator is guarantee to be
    // ready when consumed in other plugins.
    await translationManager.fetch(currentLocale);

    // Set the document language after optionally fetching the system language
    // if the setting 'locale' is set to 'default'
    document.documentElement.lang = translationManager.languageCode;

    // Set translator to UI
    if (labShell) {
      labShell.translator = translationManager;
    }

    Dialog.translator = translationManager;

    return translationManager;
  }
};

/**
 * Initialization data for the extension.
 */
const langMenu: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  description: 'Adds translation commands and settings.',
  requires: [ISettingRegistry, ITranslator, ITranslatorConnector],
  optional: [IMainMenu, ICommandPalette],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    settings: ISettingRegistry,
    translator: ITranslator,
    translatorConnector: ITranslatorConnector,
    mainMenu: IMainMenu | null,
    palette: ICommandPalette | null
  ) => {
    const trans = translator.load('jupyterlab');
    const { commands } = app;

    // Create a languages menu
    const languagesMenu = mainMenu
      ? mainMenu.settingsMenu.items.find(
          item =>
            item.type === 'submenu' &&
            item.submenu?.id === 'jp-mainmenu-settings-language'
        )?.submenu
      : null;

    // Get list of available locales
    translatorConnector
      .fetch()
      .then(languageList => {
        const appLocale = translator.languageCode.replace('-', '_');
        for (const locale in languageList.data) {
          const value = languageList.data[locale];
          const displayName = value.displayName;
          const nativeName = value.nativeName;
          const toggled = appLocale === locale;
          const label = toggled
            ? `${displayName}`
            : `${displayName} - ${nativeName}`;

          // Add a command per language
          const command = `jupyterlab-translation:${locale}`;
          commands.addCommand(command, {
            label: label,
            caption: trans.__('Change interface language to %1', label),
            isEnabled: () => !toggled,
            isToggled: () => toggled,
            execute: async () => {
              const result = await showDialog({
                title: trans.__('Change interface language?'),
                body: trans.__(
                  'After changing the interface language to %1, you will need to reload JupyterLab to see the changes.',
                  label
                ),
                buttons: [
                  Dialog.cancelButton(),
                  Dialog.okButton({ label: trans.__('Change and reload') })
                ]
              });

              if (result.button.accept) {
                try {
                  await settings.set(PLUGIN_ID, 'locale', locale);
                  window.location.reload();
                } catch (reason) {
                  console.error(
                    `Failed to update language locale to ${locale}`,
                    reason
                  );
                }
              }
            }
          });

          // Add the language command to the menu
          if (languagesMenu) {
            languagesMenu.addItem({
              command,
              args: {}
            });
          }

          if (palette) {
            palette.addItem({
              category: trans.__('Display Languages'),
              command
            });
          }
        }
      })
      .catch(reason => {
        console.error(`Available locales errored!\n${reason}`);
      });
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<unknown>[] = [
  translatorConnector,
  translator,
  langMenu
];
export default plugins;
