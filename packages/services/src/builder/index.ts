// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PageConfig, URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '../serverconnection';

/**
 * The url for the lab build service.
 */
const BUILD_SETTINGS_URL = 'api/build';

/**
 * The build API service manager.
 */
export class BuildManager {
  /**
   * Create a new setting manager.
   */
  constructor(options: BuildManager.IOptions = {}) {
    this.serverSettings =
      options.serverSettings ?? ServerConnection.makeSettings();
    this.translator = options.translator ?? Private.nullTranslator;
  }

  /**
   * The server settings used to make API requests.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * The application language translator.
   */
  get translator(): BuildManager.ITranslator {
    return this._translator;
  }
  set translator(value: BuildManager.ITranslator) {
    this._translator = value;
    this._trans = value.load('jupyterlab');
  }

  /**
   * Test whether the build service is available.
   */
  get isAvailable(): boolean {
    return PageConfig.getOption('buildAvailable').toLowerCase() === 'true';
  }

  /**
   * Test whether to check build status automatically.
   */
  get shouldCheck(): boolean {
    return PageConfig.getOption('buildCheck').toLowerCase() === 'true';
  }

  /**
   * Get whether the application should be built.
   */
  getStatus(): Promise<BuildManager.IStatus> {
    const { _url, serverSettings } = this;
    const promise = ServerConnection.makeRequest(_url, {}, serverSettings);

    return promise
      .then(response => {
        if (response.status !== 200) {
          throw new ServerConnection.ResponseError(response);
        }

        return response.json();
      })
      .then(data => {
        if (typeof data.status !== 'string') {
          throw new Error('Invalid data');
        }
        if (typeof data.message !== 'string') {
          throw new Error('Invalid data');
        }
        return data;
      });
  }

  /**
   * Build the application.
   */
  build(): Promise<void> {
    const { _trans, _url, serverSettings } = this;
    const init = { method: 'POST' };
    const promise = ServerConnection.makeRequest(_url, init, serverSettings);

    return promise.then(response => {
      if (response.status === 400) {
        throw new ServerConnection.ResponseError(
          response,
          _trans.__('Build aborted')
        );
      }
      if (response.status !== 200) {
        const message = _trans.__(
          `Build failed with %1.

        If you are experiencing the build failure after installing an extension (or trying to include previously installed extension after updating JupyterLab) please check the extension repository for new installation instructions as many extensions migrated to the prebuilt extensions system which no longer requires rebuilding JupyterLab (but uses a different installation procedure, typically involving a package manager such as 'pip' or 'conda').

        If you specifically intended to install a source extension, please run 'jupyter lab build' on the server for full output.`,
          response.status
        );
        throw new ServerConnection.ResponseError(response, message);
      }
    });
  }

  /**
   * Cancel an active build.
   */
  cancel(): Promise<void> {
    const { _url, serverSettings } = this;
    const init = { method: 'DELETE' };
    const promise = ServerConnection.makeRequest(_url, init, serverSettings);

    return promise.then(response => {
      if (response.status !== 204) {
        throw new ServerConnection.ResponseError(response);
      }
    });
  }

  /**
   * Get the build API URL.
   */
  private get _url(): string {
    const { baseUrl, appUrl } = this.serverSettings;
    return URLExt.join(baseUrl, appUrl, BUILD_SETTINGS_URL);
  }

  private _translator: BuildManager.ITranslator;
  private _trans: BuildManager.TranslationBundle;
}

/**
 * A namespace for `BuildManager` statics.
 */
export namespace BuildManager {
  /**
   * The instantiation options for a setting manager.
   */
  export interface IOptions {
    /**
     * The server settings used to make API requests.
     */
    serverSettings?: ServerConnection.ISettings;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }

  /**
   * Bundle of translation functions.
   */
  export type TranslationBundle = {
    /**
     * Translate a message without plural inflection.
     */
    __(msgid: string, ...args: unknown[]): string;
  };

  /**
   * Translation provider interface.
   */
  export interface ITranslator {
    /**
     * The code of the language in use.
     */
    readonly languageCode: string;

    /**
     * Load translation bundles for a given domain.
     */
    load(domain: string): TranslationBundle;
  }

  /**
   * The build status response from the server.
   */
  export interface IStatus {
    /**
     * Whether a build is needed.
     */
    readonly status: 'stable' | 'needed' | 'building';

    /**
     * The message associated with the build status.
     */
    readonly message: string;
  }
}

/**
 * A namespace for builder API interfaces.
 */
export namespace Builder {
  /**
   * The interface for the build manager.
   */
  export interface IManager extends BuildManager {}
}

namespace Private {
  export const nullTranslator: BuildManager.ITranslator = {
    languageCode: 'en',
    load: () => {
      return {
        __: (msgid: string, ...args: unknown[]): string => {
          return args.reduce<string>((message, arg, index) => {
            return message.replace(
              new RegExp(`%${index + 1}`, 'g'),
              () => `${arg}`
            );
          }, msgid);
        }
      };
    }
  };
}
