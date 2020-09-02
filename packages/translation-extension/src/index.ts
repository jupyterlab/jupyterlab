/* ----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { Dialog, showDialog } from '@jupyterlab/apputils';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

import {
  ITranslator,
  ITranslatorConnector,
  TranslationManager,
  TranslatorConnector,
  requestTranslationsAPI
} from '@jupyterlab/translation';

import { Menu } from '@lumino/widgets';

/**
 * A namespace for command IDs.
 */
export namespace CommandIDs {
  export const installAdditionalLanguages =
    'jupyterlab-translation:install-additional-languages';
}

/**
 * Translation plugins
 */
const PLUGIN_ID = '@jupyterlab/translation-extension:plugin';

const connector: JupyterFrontEndPlugin<ITranslatorConnector> = {
  id: '@jupyterlab/translation:connector',
  autoStart: true,
  provides: ITranslatorConnector,
  activate: () => {
    return new TranslatorConnector();
  }
};

const translator: JupyterFrontEndPlugin<ITranslator> = {
  id: '@jupyterlab/translation:translator',
  autoStart: true,
  requires: [ISettingRegistry, ITranslatorConnector],
  provides: ITranslator,
  activate: async (app: JupyterFrontEnd, settings: ISettingRegistry) => {
    const setting = await settings.load(PLUGIN_ID);
    const currentLocale: string = setting.get('locale').composite as string;
    const translationManager = new TranslationManager();
    await translationManager.fetch(currentLocale);
    return translationManager;
  }
};

/**
 * Initialization data for the extension.
 */
const langMenu: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  requires: [IMainMenu, ISettingRegistry, ITranslator],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    mainMenu: IMainMenu,
    settings: ISettingRegistry,
    translator: ITranslator
  ) => {
    const trans = translator.load('jupyterlab');
    const { commands } = app;
    let currentLocale: string;
    /**
     * Load the settings for this extension
     *
     * @param setting Extension settings
     */
    function loadSetting(setting: ISettingRegistry.ISettings): void {
      // Read the settings and convert to the correct type
      currentLocale = setting.get('locale').composite as string;
    }

    settings
      .load(PLUGIN_ID)
      .then(setting => {
        // Read the settings
        loadSetting(setting);
        document.documentElement.lang = currentLocale;

        // Listen for your plugin setting changes using Signal
        setting.changed.connect(loadSetting);

        // Create a languages menu
        const languagesMenu: Menu = new Menu({ commands });
        languagesMenu.title.label = trans.__('Language');
        mainMenu.settingsMenu.addGroup(
          [
            {
              type: 'submenu' as Menu.ItemType,
              submenu: languagesMenu
            }
          ],
          1
        );

        let command: string;

        // Get list of available locales
        requestTranslationsAPI<any>('')
          .then(data => {
            for (const locale in data['data']) {
              const value = data['data'][locale];
              const displayName = value.displayName;
              const nativeName = value.nativeName;
              const toggled = displayName === nativeName;
              const label = toggled
                ? `${displayName}`
                : `${displayName} (${nativeName})`;

              // Add a command per language
              command = `jupyterlab-translation:${locale}`;
              commands.addCommand(command, {
                label: label,
                caption: label,
                isEnabled: () => !toggled,
                isVisible: () => true,
                isToggled: () => toggled,
                execute: () => {
                  return showDialog({
                    title: trans.__('Change interface language?'),
                    body: trans.__('Are you sure you want to refresh?'),
                    buttons: [
                      Dialog.cancelButton({ label: trans.__('Cancel') }),
                      Dialog.okButton({ label: trans.__('Ok') })
                    ]
                  }).then(result => {
                    if (result.button.accept) {
                      setting
                        .set('locale', locale)
                        .then(() => {
                          window.location.reload();
                        })
                        .catch(reason => {
                          console.error(reason);
                        });
                    }
                  });
                }
              });

              // Add the language command to the menu
              languagesMenu.addItem({
                command,
                args: {}
              });
            }
          })
          .catch(reason => {
            console.error(`Available locales errored!\n${reason}`);
          });
      })
      .catch(reason => {
        console.error(
          `The jupyterlab translation extension appears to be missing.\n${reason}`
        );
      });
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [connector, translator, langMenu];
export default plugins;
