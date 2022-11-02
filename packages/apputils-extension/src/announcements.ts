import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Notification } from '@jupyterlab/apputils';
import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  PartialJSONObject,
  ReadonlyJSONArray,
  ReadonlyJSONObject
} from '@lumino/coreutils';

const ANNOUNCEMENTS_API_URL = '/lab/api/announcements';

/**
 * Call the announcement API
 *
 * @param queryArgs Query arguments
 * @param init Initial values for the request
 * @returns The response body interpreted as JSON
 */
async function requestAPI<T>(
  queryArgs: PartialJSONObject = {},
  init: RequestInit = {}
): Promise<T> {
  // Make request to Jupyter API
  const settings = ServerConnection.makeSettings();
  const requestUrl =
    URLExt.join(settings.baseUrl, ANNOUNCEMENTS_API_URL) +
    URLExt.objectToQueryString(queryArgs);

  let response: Response;
  try {
    response = await ServerConnection.makeRequest(requestUrl, init, settings);
  } catch (error) {
    throw new ServerConnection.NetworkError(error);
  }

  const data = await response.json();

  if (!response.ok) {
    throw new ServerConnection.ResponseError(response, data.message);
  }

  return data;
}

export const announcements: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/apputils-extension:announcements',
  autoStart: true,
  optional: [ISettingRegistry, ITranslator],
  activate: (
    app: JupyterFrontEnd,
    settingRegistry: ISettingRegistry | null,
    translator: ITranslator | null
  ): void => {
    Promise.all([
      app.restored,
      settingRegistry?.load('@jupyterlab/apputils-extension:notification')
    ]).then(async ([_, settings]) => {
      const trans = (translator ?? nullTranslator).load('jupyterlab');
      try {
        const response = await requestAPI<{
          announcements: Notification.INotification[];
        }>({
          check_update:
            (settings?.get('checkForUpdates').composite as boolean) ?? true
              ? '1'
              : '0'
        });

        for (const { message, type, options } of response.announcements) {
          const isUpdateAnnouncement = (
            ((options.data as ReadonlyJSONObject)?.tags as ReadonlyJSONArray) ??
            []
          ).includes('update');

          if (isUpdateAnnouncement) {
            if (settings) {
              if (
                !(
                  (settings.get('checkForUpdates').composite as boolean) ?? true
                )
              ) {
                continue;
              }

              options.actions = [
                {
                  label: trans.__("Don't check for updates"),
                  caption: trans.__(
                    'If pressed, you will not be prompted if a new JupyterLab version is found.'
                  ),
                  callback: () => {
                    settings.set('checkForUpdates', false).catch(reason => {
                      console.error(
                        'Failed to set the `checkForUpdates` setting.',
                        reason
                      );
                    });
                  }
                }
              ];
            }
          }
          Notification.emit(message, type, options);
        }
      } catch (reason) {
        console.log('Failed to get the announcements.', reason);
      }
    });
  }
};
