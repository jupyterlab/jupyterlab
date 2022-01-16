/* ----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { ServerConnection } from '@jupyterlab/services';
import { DataConnector, IDataConnector } from '@jupyterlab/statedb';
import { Token } from '@lumino/coreutils';
import { requestTranslationsAPI } from './server';

/*
 * Translation
 */
type Language = { [key: string]: string };

export interface ITranslatorConnector
  extends IDataConnector<Language, Language, { language: string }> {}

export const ITranslatorConnector = new Token<ITranslatorConnector>(
  '@jupyterlab/translation:ITranslatorConnector'
);

export class TranslatorConnector
  extends DataConnector<Language, Language, { language: string }>
  implements ITranslatorConnector {
  constructor(
    translationsUrl: string = '',
    serverSettings?: ServerConnection.ISettings
  ) {
    super();
    this._translationsUrl = translationsUrl;
    this._serverSettings = serverSettings;
  }

  async fetch(opts: { language: string }): Promise<Language> {
    return requestTranslationsAPI(
      this._translationsUrl,
      opts.language,
      {},
      this._serverSettings
    );
  }

  private _serverSettings: ServerConnection.ISettings | undefined;
  private _translationsUrl: string;
}

/**
 * Bundle of gettext-based translation functions.
 *
 * The calls to the functions in this bundle will be automatically
 * extracted by `jupyterlab-translate` package to generate translation
 * template files if the bundle is assigned to:
 * - variable named `trans`,
 * - public attribute named `trans` (`this.trans`),
 * - private attribute named `trans` (`this._trans`),
 * - `trans` attribute `props` variable (`props.trans`),
 * - `trans` attribute `props` attribute (`this.props.trans`)
 */
export type TranslationBundle = {
  /**
   * Alias for `gettext` (translate strings without number inflection)
   * @param msgid message (text to translate)
   * @param args
   */
  __(msgid: string, ...args: any[]): string;
  /**
   * Alias for `ngettext` (translate accounting for plural forms)
   * @param msgid message for singular
   * @param msgid_plural message for plural
   * @param n determines which plural form to use
   * @param args
   */
  _n(msgid: string, msgid_plural: string, n: number, ...args: any[]): string;
  /**
   * Alias for `pgettext` (translate in given context)
   * @param msgctxt context
   * @param msgid message (text to translate)
   * @param args
   */
  _p(msgctxt: string, msgid: string, ...args: any[]): string;
  /**
   * Alias for `npgettext` (translate accounting for plural forms in given context)
   * @param msgctxt context
   * @param msgid message for singular
   * @param msgid_plural message for plural
   * @param n number used to determine which plural form to use
   * @param args
   */
  _np(
    msgctxt: string,
    msgid: string,
    msgid_plural: string,
    n: number,
    ...args: any[]
  ): string;
  gettext(msgid: string, ...args: any[]): string;
  ngettext(
    msgid: string,
    msgid_plural: string,
    n: number,
    ...args: any[]
  ): string;
  pgettext(msgctxt: string, msgid: string, ...args: any[]): string;
  npgettext(
    msgctxt: string,
    msgid: string,
    msgid_plural: string,
    n: number,
    ...args: any[]
  ): string;
  dcnpgettext(
    domain: string,
    msgctxt: string,
    msgid: string,
    msgid_plural: string,
    n: number,
    ...args: any[]
  ): string;
};

export interface ITranslator {
  load(domain: string): TranslationBundle;
  // locale(): string;
}

export const ITranslator = new Token<ITranslator>(
  '@jupyterlab/translation:ITranslator'
);
