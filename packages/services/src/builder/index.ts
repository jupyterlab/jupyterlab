// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import type { IRenderMime } from '@jupyterlab/rendermime-interfaces';

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
    const { _url, serverSettings } = this;
    const trans = this._trans;
    const init = { method: 'POST' };
    const promise = ServerConnection.makeRequest(_url, init, serverSettings);

    return promise.then(response => {
      if (response.status === 400) {
        throw new ServerConnection.ResponseError(
          response,
          trans.__('Build aborted')
        );
      }
      if (response.status !== 200) {
        const message = trans.__(
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
  export type TranslationBundle = IRenderMime.TranslationBundle;

  /**
   * Translation provider interface.
   */
  export interface ITranslator extends IRenderMime.ITranslator {}

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
  function format(message: string, args: readonly unknown[]): string {
    return message
      .replace(/%%/g, '%% ')
      .replace(/%(\d+)/g, (_match, index) => {
        return `${args[Number(index) - 1]}`;
      })
      .replace(/%% /g, '%');
  }

  function formatPlural(
    msgid: string,
    msgidPlural: string,
    n: number,
    args: readonly unknown[]
  ): string {
    return format(n === 1 ? msgid : msgidPlural, [n, ...args]);
  }

  function gettext(msgid: string, ...args: unknown[]): string {
    return format(msgid, args);
  }

  function ngettext(
    msgid: string,
    msgidPlural: string,
    n: number,
    ...args: unknown[]
  ): string {
    return formatPlural(msgid, msgidPlural, n, args);
  }

  function pgettext(
    _msgctxt: string,
    msgid: string,
    ...args: unknown[]
  ): string {
    return gettext(msgid, ...args);
  }

  function npgettext(
    _msgctxt: string,
    msgid: string,
    msgidPlural: string,
    n: number,
    ...args: unknown[]
  ): string {
    return ngettext(msgid, msgidPlural, n, ...args);
  }

  function dcnpgettext(
    _domain: string,
    msgctxt: string,
    msgid: string,
    msgidPlural: string,
    n: number,
    ...args: unknown[]
  ): string {
    return npgettext(msgctxt, msgid, msgidPlural, n, ...args);
  }

  const nullTranslationBundle: BuildManager.TranslationBundle = {
    __: gettext,
    _n: ngettext,
    _p: pgettext,
    _np: npgettext,
    gettext,
    ngettext,
    pgettext,
    npgettext,
    dcnpgettext
  };

  export const nullTranslator: BuildManager.ITranslator = {
    languageCode: 'en',
    load: (_domain: string): BuildManager.TranslationBundle => {
      return nullTranslationBundle;
    }
  };
}
