import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { murmur2, Notification } from '@jupyterlab/apputils';
import { URLExt } from '@jupyterlab/coreutils';
import { ConfigSection, ServerConnection } from '@jupyterlab/services';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';

const NEWS_API_URL = '/lab/api/news';
const UPDATE_API_URL = '/lab/api/update';

/**
 * Call the announcement API
 *
 * @param queryArgs Query arguments
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
  autoStart: true,
  optional: [ISettingRegistry, ITranslator],
  activate: (
    app: JupyterFrontEnd,
    settingRegistry: ISettingRegistry | null,
    translator: ITranslator | null
  ): void => {
    const CONFIG_SECTION_NAME = announcements.id.replace(/[^\w]/g, '');

    Promise.all([
      app.restored,
      settingRegistry?.load('@jupyterlab/apputils-extension:notification') ??
        Promise.resolve(null),
      // Use config instead of state to store independently of the workspace
      // if a news has been displayed or not.
      ConfigSection.create({
        name: CONFIG_SECTION_NAME
      })
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
          config.update(update as any);
        }
      });

      const mustFetchNews = settings?.get('fetchNews').composite as 'true' | 'false' | 'none';
      if (mustFetchNews === 'none') {
        const notificationId = Notification.emit(
          trans.__(
            'Do you want to receive official news from the JupyterLab team?'
          ) +
            '\n\n<a href="https://jupyterlab.readthedocs.io/en/latest/privacy_policies" target="_blank" rel="noreferrer">' +
            trans.__('Please read the privacy policy.') +
            '</a>',
          'default',
          {
            autoClose: false,
            actions: [
              {
                label: trans.__('Accept'),
                callback: () => {
                  Notification.dismiss(notificationId);
                  config
                    .update({})
                    .then(() => fetchNews())
                    .catch(reason => {
                      console.error(`Failed to get the news:\n${reason}`);
                    });
                  settings?.set('fetchNews', 'true').catch(reason => {
                    console.error(
                      `Failed to save setting 'fetchNews':\n${reason}`
                    );
                  });
                }
              },
              {
                label: trans.__('Refuse'),
                callback: () => {
                  Notification.dismiss(notificationId);
                  settings?.set('fetchNews', 'false').catch(reason => {
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
        if (settings?.get('fetchNews').composite ?? 'false') {
          try {
            const response = await requestAPI<{
              news: Notification.INotification[];
            }>(NEWS_API_URL);

            for (const { message, type, options } of response.news) {
              // @ts-expect-error data has no index
              const id = options.data!['id'] as string;
              // Filter those notifications
              const state = (config.data[id] as INewsState) ?? {
                seen: false,
                dismissed: false
              };
              if (!state.dismissed) {
                options.actions = [
                  {
                    label: trans.__("Don't show me again"),
                    callback: () => {
                      const update: { [k: string]: INewsState } = {};
                      update[id] = { seen: true, dismissed: true };
                      config.update(update as any);
                    }
                  }
                ];
                if (!state.seen) {
                  options.autoClose = 5000;
                  const update: { [k: string]: INewsState } = {};
                  update[id] = { seen: true };
                  config.update(update as any);
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
            notification: Notification.INotification | null;
          }>(UPDATE_API_URL);

          if (response.notification) {
            const { message, type, options } = response.notification;
            const id = murmur2(message, 51).toString();
            const state = (config.data[id] as INewsState) ?? {
              seen: false,
              dismissed: false
            };
            if (!state.dismissed) {
              let notificationId: string;
              options.actions = [
                {
                  label: trans.__("Don't check for updates"),
                  caption: trans.__(
                    'If pressed, you will not be prompted if a new JupyterLab version is found.'
                  ),
                  callback: () => {
                    settings
                      ?.set('checkForUpdates', false)
                      .then(() => {
                        Notification.dismiss(notificationId);
                      })
                      .catch(reason => {
                        console.error(
                          'Failed to set the `checkForUpdates` setting.',
                          reason
                        );
                      });
                  }
                }
              ];
              if (!state.seen) {
                options.autoClose = 5000;
                const update: { [k: string]: INewsState } = {};
                update[id] = { seen: true };
                config.update(update as any);
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
