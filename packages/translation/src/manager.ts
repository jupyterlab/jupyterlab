// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ServerConnection } from '@jupyterlab/services';
import { Gettext } from './gettext';
import {
  DEFAULT_LANGUAGE_CODE,
  DomainData,
  ITranslator,
  ITranslatorConnector,
  Language,
  TranslationBundle,
  TranslatorConnector
} from './tokens';
import { normalizeDomain } from './utils';

/**
 * Translation Manager.
 */
export class TranslationManager implements ITranslator {
  /**
   * Construct a new TranslationManager.
   *
   * @param translationsUrl The URL of the translation server.
   * @param stringsPrefix (optional) The prefix for translation strings.
   * @param serverSettings (optional) The server settings.
   * @param connector (optional) The translation connector. If provided, the `translationsUrl` and `serverSettings` parameters will be ignored.
   */
  constructor(
    translationsUrl: string = '',
    stringsPrefix?: string,
    serverSettings?: ServerConnection.ISettings,
    connector?: ITranslatorConnector
  ) {
    this._connector =
      connector ?? new TranslatorConnector(translationsUrl, serverSettings);
    this._stringsPrefix = stringsPrefix || '';
    this._englishBundle = new Gettext({ stringsPrefix: this._stringsPrefix });
    this._currentLocale = DEFAULT_LANGUAGE_CODE;
  }

  /**
   * Get the language code (tag) of the current locale.
   *
   * It respects BCP47 (RFC5646): https://datatracker.ietf.org/doc/html/rfc5646
   */
  get languageCode(): string {
    return this._currentLocale;
  }

  /**
   * Fetch the localization data from the server.
   *
   * @param locale The language locale to use for translations.
   */
  async fetch(locale: string): Promise<void> {
    this._languageData = await this._connector.fetch({ language: locale });
    let serverLocale: string | undefined;
    if (this._languageData && locale === 'default') {
      try {
        for (const lang of Object.values(this._languageData.data ?? {})) {
          serverLocale =
            // If the language is provided by the system set up, we need to retrieve the final
            // language. This is done through the `""` entry in `_languageData` that contains
            // language metadata.
            lang['']['language'];
          break;
        }
      } catch (reason) {
        // no-op
      }
    }

    this._currentLocale = (
      locale !== 'default' ? locale : serverLocale ?? DEFAULT_LANGUAGE_CODE
    ).replace('_', '-');

    this._domainData = this._languageData?.data ?? {};
    const message = this._languageData?.message;
    if (message && this._currentLocale !== DEFAULT_LANGUAGE_CODE) {
      console.warn(message);
    }
  }

  /**
   * Load translation bundles for a given domain.
   *
   * @param domain The translation domain to use for translations.
   */
  load(domain: string): TranslationBundle {
    if (this._domainData) {
      if (this._currentLocale == DEFAULT_LANGUAGE_CODE) {
        return this._englishBundle;
      } else {
        domain = normalizeDomain(domain);
        if (!(domain in this._translationBundles)) {
          let translationBundle = new Gettext({
            domain: domain,
            locale: this._currentLocale,
            stringsPrefix: this._stringsPrefix
          });
          if (domain in this._domainData) {
            const metadata = this._domainData[domain][''];
            const harmonizedData = {
              ...this._domainData[domain],
              '': {
                ...metadata,
                pluralForms: metadata.plural_forms
              }
            };
            translationBundle.loadJSON(harmonizedData, domain);
          }
          this._translationBundles[domain] = translationBundle;
        }
        return this._translationBundles[domain];
      }
    } else {
      return this._englishBundle;
    }
  }

  private _connector: ITranslatorConnector;
  private _currentLocale: string;
  private _domainData: Record<string, DomainData> = {};
  private _englishBundle: Gettext;
  private _languageData: Language | undefined;
  private _stringsPrefix: string;
  private _translationBundles: Record<string, TranslationBundle> = {};
}
