/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Notification } from '@jupyterlab/apputils';
import { URLExt } from '@jupyterlab/coreutils';
import {
  ConfigSection,
  IConfigSectionManager,
  ServerConnection
} from '@jupyterlab/services';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';

const COMMAND_HELP_OPEN = 'help:open';
const NEWS_API_URL = '/lab/api/news';
const UPDATE_API_URL = '/lab/api/update';
const PRIVACY_URL =
  'https://jupyterlab.readthedocs.io/en/latest/privacy_policies.html';

/**
 * Call the announcement API
 *
 * @param endpoint Endpoint to request
 * @param init Initial values for the request
 * @returns The response body interpreted as JSON
 */
async function requestAPI<T>(
  endpoint: string,
  init: RequestInit = {}
): Promise<T> {
  // Make request to Jupyter API
  const settings = ServerConnection.makeSettings();
  const requestUrl = URLExt.join(settings.baseUrl, endpoint);

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
  description:
    'Add the announcement feature. It will fetch news on the internet and check for application updates.',
  autoStart: true,
  optional: [IConfigSectionManager, ISettingRegistry, ITranslator],
  activate: (
    app: JupyterFrontEnd,
    configSectionManager: ConfigSection.IManager | null,
    settingRegistry: ISettingRegistry | null,
    translator: ITranslator | null
  ): void => {
    const CONFIG_SECTION_NAME = announcements.id.replace(/[^\w]/g, '');

    void Promise.all([
      app.restored,
      settingRegistry?.load('@jupyterlab/apputils-extension:notification') ??
        Promise.resolve(null),
      // Use config instead of state to store independently of the workspace
      // if a news has been displayed or not.
      configSectionManager?.create({
        name: CONFIG_SECTION_NAME
      }) ?? Promise.resolve(null)
    ]).then(async ([_, settings, config]) => {
      const trans = (translator ?? nullTranslator).load('jupyterlab');

      // Store dismiss state
      Notification.manager.changed.connect((manager, change) => {
        if (change.type !== 'removed') {
          return;
        }
        const { id, tags }: { id?: string; tags?: Array<string> } = (change
          .notification.options.data ?? {}) as any;
        if ((tags ?? []).some(tag => ['news', 'update'].includes(tag)) && id) {
          const update: { [k: string]: INewsState } = {};
          update[id] = { seen: true, dismissed: true };
          config?.update(update as any).catch(reason => {
            console.error(
              `Failed to update the announcements config:\n${reason}`
            );
          });
        }
      });

      const mustFetchNews = settings?.get('fetchNews').composite as
        | 'true'
        | 'false'
        | 'none';
      if (mustFetchNews === 'none') {
        const notificationId = Notification.emit(
          trans.__(
            'Would you like to get notified about official Jupyter news?'
          ),
          'default',
          {
            autoClose: false,
            actions: [
              {
                label: trans.__('Open privacy policy'),
                caption: PRIVACY_URL,
                callback: event => {
                  event.preventDefault();
                  if (app.commands.hasCommand(COMMAND_HELP_OPEN)) {
                    void app.commands.execute(COMMAND_HELP_OPEN, {
                      text: trans.__('Privacy policies'),
                      url: PRIVACY_URL
                    });
                  } else {
                    window.open(PRIVACY_URL, '_blank', 'noreferrer');
                  }
                },
                displayType: 'link'
              },
              {
                label: trans.__('Yes'),
                callback: () => {
                  Notification.dismiss(notificationId);
                  config
                    ?.update({})
                    .then(() => fetchNews())
                    .catch(reason => {
                      console.error(`Failed to get the news:\n${reason}`);
                    });
                  settings?.set('fetchNews', 'true').catch((reason: any) => {
                    console.error(
                      `Failed to save setting 'fetchNews':\n${reason}`
                    );
                  });
                }
              },
              {
                label: trans.__('No'),
                callback: () => {
                  Notification.dismiss(notificationId);
                  settings?.set('fetchNews', 'false').catch((reason: any) => {
                    console.error(
                      `Failed to save setting 'fetchNews':\n${reason}`
                    );
                  });
                }
              }
            ]
          }
        );
      } else {
        await fetchNews();
      }

      async function fetchNews() {
        if ((settings?.get('fetchNews').composite ?? 'false') === 'true') {
          try {
            const response = await requestAPI<{
              news: (Notification.INotification & {
                link?: [string, string];
              })[];
            }>(NEWS_API_URL);

            for (const { link, message, type, options } of response.news) {
              // @ts-expect-error data has no index
              const id = options.data!['id'] as string;
              // Filter those notifications
              const state = (config?.data[id] as INewsState) ?? {
                seen: false,
                dismissed: false
              };
              if (!state.dismissed) {
                options.actions = [
                  {
                    label: trans.__('Hide'),
                    caption: trans.__('Never show this notification again.'),
                    callback: () => {
                      const update: { [k: string]: INewsState } = {};
                      update[id] = { seen: true, dismissed: true };
                      config?.update(update as any).catch(reason => {
                        console.error(
                          `Failed to update the announcements config:\n${reason}`
                        );
                      });
                    }
                  }
                ];
                if (link?.length === 2) {
                  options.actions.push({
                    label: link[0],
                    caption: link[1],
                    callback: () => {
                      window.open(link[1], '_blank', 'noreferrer');
                    },
                    displayType: 'link'
                  });
                }
                if (!state.seen) {
                  options.autoClose = 5000;
                  const update: { [k: string]: INewsState } = {};
                  update[id] = { seen: true };
                  config?.update(update as any).catch(reason => {
                    console.error(
                      `Failed to update the announcements config:\n${reason}`
                    );
                  });
                }

                Notification.emit(message, type, options);
              }
            }
          } catch (reason) {
            console.log('Failed to get the announcements.', reason);
          }
        }

        if ((settings?.get('checkForUpdates').composite as boolean) ?? true) {
          const response = await requestAPI<{
            notification:
              | (Notification.INotification & {
                  link?: [string, string];
                })
              | null;
          }>(UPDATE_API_URL);

          if (response.notification) {
            const { link, message, type, options } = response.notification;
            // @ts-expect-error data has no index
            const id = options.data!['id'] as string;
            const state = (config?.data[id] as INewsState) ?? {
              seen: false,
              dismissed: false
            };
            if (!state.dismissed) {
              let notificationId: string;
              options.actions = [
                {
                  label: trans.__('Ignore all updates'),
                  caption: trans.__(
                    'Do not prompt me if a new JupyterLab version is available.'
                  ),
                  callback: () => {
                    settings
                      ?.set('checkForUpdates', false)
                      .then(() => {
                        Notification.dismiss(notificationId);
                      })
                      .catch((reason: any) => {
                        console.error(
                          'Failed to set the `checkForUpdates` setting.',
                          reason
                        );
                      });
                  }
                }
              ];
              if (link?.length === 2) {
                options.actions.push({
                  label: link[0],
                  caption: link[1],
                  callback: () => {
                    window.open(link[1], '_blank', 'noreferrer');
                  },
                  // Because the link to the changelog is the primary option,
                  // display it in an accent color.
                  displayType: 'accent'
                });
              }
              if (!state.seen) {
                options.autoClose = 5000;
                const update: { [k: string]: INewsState } = {};
                update[id] = { seen: true };
                config?.update(update as any).catch(reason => {
                  console.error(
                    `Failed to update the announcements config:\n${reason}`
                  );
                });
              }
              notificationId = Notification.emit(message, type, options);
            }
          }
        }
      }
    });
  }
};

/**
 * News state
 */
interface INewsState {
  /**
   * Whether the news has been seen or not.
   */
  seen?: boolean;
  /**
   * Whether the user has dismissed the news or not.
   */
  dismissed?: boolean;
}
