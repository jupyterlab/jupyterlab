// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Gettext } from './gettext';
import { ITranslator, TranslationBundle, TranslatorConnector } from './tokens';

/**
 * Translation Manager
 */
export class TranslationManager implements ITranslator {
  constructor() {
    this._connector = new TranslatorConnector();
  }

  /**
   * Fetch the localization data from the server.
   *
   * @param locale The language locale to use for translations.
   */
  async fetch(locale: string) {
    this._currentLocale = locale;
    this._languageData = await this._connector.fetch({ language: locale });
    this._domainData = this._languageData?.data || {};
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
        if (!(domain in this._translationBundles)) {
          let translationBundle = new Gettext({
            domain: domain,
            locale: this._currentLocale
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
  private _englishBundle = new Gettext();
  private _languageData: any;
  private _translationBundles: any = {};
}
