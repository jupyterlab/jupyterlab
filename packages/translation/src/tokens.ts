/* ----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import type { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { ServerConnection } from '@jupyterlab/services';
import { DataConnector, IDataConnector } from '@jupyterlab/statedb';
import { Token } from '@lumino/coreutils';
import { requestTranslationsAPI } from './server';

/**
 * Application default locale.
 */
export const DEFAULT_LANGUAGE_CODE = 'en';

/**
 * Metadata describing translation domain.
 */
interface IDomainMetadata {
  /**
   * Domain name, e.g. jupyterlab-git.
   */
  domain: string;
  /**
   * Language.
   */
  language: string;
  /**
   * Plural forms string in gettext format, e.g. `nplurals=2; plural=(n > 1);`.
   */
  plural_forms: string;
  /**
   * Version.
   */
  version?: string;
}

/**
 * Domain data is a key-value map of translations.
 *
 * Empty string key is a special value with the domain metadata.
 */
export type DomainData = Record<string, string[]> & {
  '': IDomainMetadata;
};

/*
 * Translation data.
 */
export type Language = {
  /**
   * Warning message, empty string if absent.
   *
   * Present if requested language pack is invalid or missing.
   */
  message: string;
  /**
   * Domain data, keyed by domain name.
   */
  data: Record<string, DomainData>;
};

/**
 * Description of language.
 */
export interface ILanguageData {
  /**
   * Display name of the language in the current language.
   */
  displayName: string;
  /**
   * Display name of the language in the language itself.
   */
  nativeName: string;
}

/*
 * List of available languages.
 */
export interface ILanguageList {
  /**
   * Warning message, empty string if absent.
   *
   * Present if one or more language packs is invalid.
   */
  message: string;
  /**
   * List of available languages, keyed by language identifier.
   */
  data: Record<string, ILanguageData>;
}

/**
 * Translation connection interface.
 */
export interface ITranslatorConnector
  extends IDataConnector<
    Language,
    Language | ILanguageList,
    { language: string } | undefined
  > {
  /**
   * Fetch language list or given language.
   */
  fetch(): Promise<ILanguageList>;
  fetch(opts: { language: string }): Promise<Language>;
}

/**
 * A service to connect to the server translation endpoint
 */
export const ITranslatorConnector = new Token<ITranslatorConnector>(
  '@jupyterlab/translation:ITranslatorConnector',
  'A service to connect to the server translation endpoint.'
);

export class TranslatorConnector
  extends DataConnector<Language, Language, { language: string } | undefined>
  implements ITranslatorConnector
{
  constructor(
    translationsUrl: string = '',
    serverSettings?: ServerConnection.ISettings
  ) {
    super();
    this._translationsUrl = translationsUrl;
    this._serverSettings = serverSettings;
  }

  async fetch(): Promise<ILanguageList>;
  async fetch(opts: { language: string }): Promise<Language>;
  async fetch(opts?: { language: string }): Promise<Language | ILanguageList> {
    return requestTranslationsAPI(
      this._translationsUrl,
      opts?.language ?? '',
      {},
      this._serverSettings
    );
  }

  private _serverSettings: ServerConnection.ISettings | undefined;
  private _translationsUrl: string;
}

/**
 * Bundle of gettext-based translation functions for a specific domain.
 */
export type TranslationBundle = IRenderMime.TranslationBundle;

/**
 * Translation provider interface
 */
export interface ITranslator extends IRenderMime.ITranslator {}

/**
 * Translation provider token
 */
export const ITranslator = new Token<ITranslator>(
  '@jupyterlab/translation:ITranslator',
  'A service to translate strings.'
);
