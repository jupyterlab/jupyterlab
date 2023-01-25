// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ServerConnection } from '@jupyterlab/services';
import { Gettext } from './gettext';
import { ITranslator, TranslationBundle, TranslatorConnector } from './tokens';
import { normalizeDomain } from './utils';

/**
 * Translation Manager
 */
export class TranslationManager implements ITranslator {
  constructor(
    translationsUrl: string = '',
    stringsPrefix?: string,
    serverSettings?: ServerConnection.ISettings
  ) {
    this._connector = new TranslatorConnector(translationsUrl, serverSettings);
    this._stringsPrefix = stringsPrefix || '';
    this._englishBundle = new Gettext({ stringsPrefix: this._stringsPrefix });
  }

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
    if (this._languageData && locale === 'default') {
      try {
        for (const lang of Object.values(this._languageData.data ?? {})) {
          this._currentLocale =
            // If the language is provided by the system set up, we need to retrieve the final
            // language. This is done through the `""` entry in `_languageData` that contains
            // language metadata.
            ((lang as any)['']['language'] as string).replace('_', '-');
          break;
        }
      } catch (reason) {
        this._currentLocale = 'en';
      }
    } else {
      this._currentLocale = locale;
    }

    this._domainData = this._languageData?.data ?? {};
    const message: string = this._languageData?.message;
    if (message && locale !== 'en') {
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
      if (this._currentLocale == 'en') {
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
            let metadata = this._domainData[domain][''];
            if ('plural_forms' in metadata) {
              metadata.pluralForms = metadata.plural_forms;
              delete metadata.plural_forms;
              this._domainData[domain][''] = metadata;
            }
            translationBundle.loadJSON(this._domainData[domain], domain);
          }
          this._translationBundles[domain] = translationBundle;
        }
        return this._translationBundles[domain];
      }
    } else {
      return this._englishBundle;
    }
  }

  private _connector: TranslatorConnector;
  private _currentLocale: string;
  private _domainData: any = {};
  private _englishBundle: Gettext;
  private _languageData: any;
  private _stringsPrefix: string;
  private _translationBundles: any = {};
}
