/* ----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|
| Base gettext.js implementation.
| Copyright (c) Guillaume Potier.
| Distributed under the terms of the Modified MIT License.
| See: https://github.com/guillaumepotier/gettext.js
|
| Type definitions.
| Copyright (c) Julien Crouzet and Florian Schwingenschlögl.
| Distributed under the terms of the Modified MIT License.
| See: https://github.com/DefinitelyTyped/DefinitelyTyped
|----------------------------------------------------------------------------*/

/**
 * A plural form function.
 */
type PluralForm = (n: number) => number;

/**
 * Metadata for a language pack.
 */
interface IJsonDataHeader {
  /**
   * Language locale. Example: es_CO, es-CO.
   */
  language: string;

  /**
   * The domain of the translation, usually the normalized package name.
   * Example: "jupyterlab", "jupyterlab_git"
   */
  domain: string;

  /**
   * String describing the plural of the given language.
   * See: https://www.gnu.org/software/gettext/manual/html_node/Translating-plural-forms.html
   */
  pluralForms: string;
}

/**
 * Translatable string messages.
 */
interface IJsonDataMessages {
  /**
   * Translation strings for a given msg_id.
   */
  [key: string]: string[] | IJsonDataHeader;
}

/**
 * Translatable string messages incluing metadata.
 */
interface IJsonData extends IJsonDataMessages {
  /**
   * Metadata of the language bundle.
   */
  '': IJsonDataHeader;
}

/**
 * Configurable options for the Gettext constructor.
 */
interface IOptions {
  /**
   * Language locale. Example: es_CO, es-CO.
   */
  locale?: string;

  /**
   * The domain of the translation, usually the normalized package name.
   * Example: "jupyterlab", "jupyterlab_git"
   */
  domain?: string;

  /**
   * The delimiter to use when adding contextualized strings.
   */
  contextDelimiter?: string;

  /**
   * Translation message strings.
   */
  messages?: Array<string>;

  /**
   * String describing the plural of the given language.
   * See: https://www.gnu.org/software/gettext/manual/html_node/Translating-plural-forms.html
   */
  pluralForms?: string;

  /**
   * Plural form function.
   */
  pluralFunc?: PluralForm;
}

/**
 * Options of the main translation `t` method.
 */
interface ITOptions {
  /**
   * String describing the plural of the given language.
   * See: https://www.gnu.org/software/gettext/manual/html_node/Translating-plural-forms.html
   */
  pluralForm?: string;

  /**
   * Plural form function.
   */
  pluralFunc?: PluralForm;

  /**
   * Language locale. Example: es_CO, es-CO.
   */
  locale?: string;
}

/**
 * Gettext class providing localization methods.
 */
class Gettext {
  constructor(options?: IOptions) {
    options = options || {};

    // default values that could be overriden in Gettext() constructor
    this._defaults = {
      domain: 'messages',
      locale: document.documentElement.getAttribute('lang') || 'en',
      pluralFunc: function (n: number) {
        return { nplurals: 2, plural: n != 1 ? 1 : 0 };
      },
      contextDelimiter: String.fromCharCode(4) // \u0004
    };

    // Ensure the correct separator is used
    this._locale = (options.locale || this._defaults.locale).replace('_', '-');
    this._domain = options.domain || this._defaults.domain;
    this._contextDelimiter =
      options.contextDelimiter || this._defaults.contextDelimiter;
    this._pluralFuncs = {};
    this._dictionary = {};
    this._pluralForms = {};

    if (options.messages) {
      this._dictionary[this._domain] = {};
      this._dictionary[this._domain][this._locale] = options.messages;
    }

    if (options.pluralForms) {
      this._pluralForms[this._locale] = options.pluralForms;
    }
  }

  /**
   * Set current context delimiter.
   *
   * @param delimiter - The delimiter to set.
   */
  setContextDelimiter(delimiter: string): void {
    this._contextDelimiter = delimiter;
  }

  /**
   * Get current context delimiter.
   *
   * @return The current delimiter.
   */
  getContextDelimiter(): string {
    return this._contextDelimiter;
  }

  /**
   * Set current locale.
   *
   * @param locale - The locale to set.
   */
  setLocale(locale: string): void {
    this._locale = locale.replace('_', '-');
  }

  /**
   * Get current locale.
   *
   * @return The current locale.
   */
  getLocale(): string {
    return this._locale;
  }

  /**
   * Set current domain.
   *
   * @param domain - The domain to set.
   */
  setDomain(domain: string): void {
    this._domain = domain;
  }

  /**
   * Get current domain.
   *
   * @return The current domain string.
   */
  getDomain(): string {
    return this._domain;
  }

  /**
   * `sprintf` equivalent, takes a string and some arguments to make a
   * computed string.
   *
   * @param fmt - The string to interpolate.
   * @param args - The variables to use in interpolation.
   *
   * ### Examples
   * strfmt("%1 dogs are in %2", 7, "the kitchen"); => "7 dogs are in the kitchen"
   * strfmt("I like %1, bananas and %1", "apples"); => "I like apples, bananas and apples"
   */
  static strfmt(fmt: string, ...args: any[]): string {
    return (
      fmt
        // put space after double % to prevent placeholder replacement of such matches
        .replace(/%%/g, '%% ')
        // replace placeholders
        .replace(/%(\d+)/g, function (str, p1) {
          return args[p1 - 1];
        })
        // replace double % and space with single %
        .replace(/%% /g, '%')
    );
  }

  /**
   * Load json translations strings (In Jed 2.x format).
   *
   * @param jsonData - The translation strings plus metadata.
   * @param domain - The translation domain, e.g. "jupyterlab".
   */
  loadJSON(jsonData: IJsonData, domain: string): void {
    if (
      !jsonData[''] ||
      !jsonData['']['language'] ||
      !jsonData['']['pluralForms']
    ) {
      throw new Error(
        `Wrong jsonData, it must have an empty key ("") with "language" and "pluralForms" information: ${jsonData}`
      );
    }

    let headers = jsonData[''];
    let jsonDataCopy = JSON.parse(JSON.stringify(jsonData));
    delete jsonDataCopy[''];

    this.setMessages(
      domain || this._defaults.domain,
      headers['language'],
      jsonDataCopy,
      headers['pluralForms']
    );
  }

  /**
   * Shorthand for gettext.
   *
   * @param msgid - The singular string to translate.
   * @param args - Any additional values to use with interpolation.
   *
   * @return A translated string if found, or the original string.
   *
   * ### Notes
   * This is not a private method (starts with an underscore) it is just
   * a shorter and standard way to call these methods.
   */
  __(msgid: string, ...args: any[]): string {
    return this.gettext(msgid, ...args);
  }

  /**
   * Shorthand for ngettext.
   *
   * @param msgid - The singular string to translate.
   * @param msgid_plural - The plural string to translate.
   * @param n - The number for pluralization.
   * @param args - Any additional values to use with interpolation.
   *
   * @return A translated string if found, or the original string.
   *
   * ### Notes
   * This is not a private method (starts with an underscore) it is just
   * a shorter and standard way to call these methods.
   */
  _n(msgid: string, msgid_plural: string, n: number, ...args: any[]): string {
    return this.ngettext(msgid, msgid_plural, n, ...args);
  }

  /**
   * Shorthand for pgettext.
   *
   * @param msgctxt - The message context.
   * @param msgid - The singular string to translate.
   * @param args - Any additional values to use with interpolation.
   *
   * @return A translated string if found, or the original string.
   *
   * ### Notes
   * This is not a private method (starts with an underscore) it is just
   * a shorter and standard way to call these methods.
   */
  _p(msgctxt: string, msgid: string, ...args: any[]): string {
    return this.pgettext(msgctxt, msgid, ...args);
  }

  /**
   * Shorthand for npgettext.
   *
   * @param msgctxt - The message context.
   * @param msgid - The singular string to translate.
   * @param msgid_plural - The plural string to translate.
   * @param n - The number for pluralization.
   * @param args - Any additional values to use with interpolation.
   *
   * @return A translated string if found, or the original string.
   *
   * ### Notes
   * This is not a private method (starts with an underscore) it is just
   * a shorter and standard way to call these methods.
   */
  _np(
    msgctxt: string,
    msgid: string,
    msgid_plural: string,
    n: number,
    ...args: any[]
  ): string {
    return this.npgettext(msgctxt, msgid, msgid_plural, n, ...args);
  }

  /**
   * Translate a singular string with extra interpolation values.
   *
   * @param msgid - The singular string to translate.
   * @param args - Any additional values to use with interpolation.
   *
   * @return A translated string if found, or the original string.
   */
  gettext(msgid: string, ...args: any[]): string {
    return this.dcnpgettext('', '', msgid, '', 0, ...args);
  }

  /**
   * Translate a plural string with extra interpolation values.
   *
   * @param msgid - The singular string to translate.
   * @param args - Any additional values to use with interpolation.
   *
   * @return A translated string if found, or the original string.
   */
  ngettext(
    msgid: string,
    msgid_plural: string,
    n: number,
    ...args: any[]
  ): string {
    return this.dcnpgettext('', '', msgid, msgid_plural, n, ...args);
  }

  /**
   * Translate a contextualized singular string with extra interpolation values.
   *
   * @param msgctxt - The message context.
   * @param msgid - The singular string to translate.
   * @param args - Any additional values to use with interpolation.
   *
   * @return A translated string if found, or the original string.
   *
   * ### Notes
   * This is not a private method (starts with an underscore) it is just
   * a shorter and standard way to call these methods.
   */
  pgettext(msgctxt: string, msgid: string, ...args: any[]): string {
    return this.dcnpgettext('', msgctxt, msgid, '', 0, ...args);
  }

  /**
   * Translate a contextualized plural string with extra interpolation values.
   *
   * @param msgctxt - The message context.
   * @param msgid - The singular string to translate.
   * @param msgid_plural - The plural string to translate.
   * @param n - The number for pluralization.
   * @param args - Any additional values to use with interpolation
   *
   * @return A translated string if found, or the original string.
   */
  npgettext(
    msgctxt: string,
    msgid: string,
    msgid_plural: string,
    n: number,
    ...args: any[]
  ): string {
    return this.dcnpgettext('', msgctxt, msgid, msgid_plural, n, ...args);
  }

  /**
   * Translate a singular string with extra interpolation values.
   *
   * @param domain - The translations domain.
   * @param msgctxt - The message context.
   * @param msgid - The singular string to translate.
   * @param msgid_plural - The plural string to translate.
   * @param n - The number for pluralization.
   * @param args - Any additional values to use with interpolation
   *
   * @return A translated string if found, or the original string.
   */
  dcnpgettext(
    domain: string,
    msgctxt: string,
    msgid: string,
    msgid_plural: string,
    n: number,
    ...args: any[]
  ): string {
    domain = domain || this._domain;

    let translation: Array<string>;
    let key: string = msgctxt
      ? msgctxt + this._contextDelimiter + msgid
      : msgid;
    let options: any = { pluralForm: false };
    let exist: boolean = false;
    let locale: string = this._locale;
    let locales = this.expandLocale(this._locale);

    for (let i in locales) {
      locale = locales[i];
      exist =
        this._dictionary[domain] &&
        this._dictionary[domain][locale] &&
        this._dictionary[domain][locale][key];

      // check condition are valid (.length)
      // because it's not possible to define both a singular and a plural form of the same msgid,
      // we need to check that the stored form is the same as the expected one.
      // if not, we'll just ignore the translation and consider it as not translated.
      if (msgid_plural) {
        exist = exist && this._dictionary[domain][locale][key].length > 1;
      } else {
        exist = exist && this._dictionary[domain][locale][key].length == 1;
      }

      if (exist) {
        // This ensures that a variation is used.
        options.locale = locale;
        break;
      }
    }

    if (!exist) {
      translation = [msgid];
      options.pluralFunc = this._defaults.pluralFunc;
    } else {
      translation = this._dictionary[domain][locale][key];
    }

    // Singular form
    if (!msgid_plural) {
      return this.t(translation, n, options, ...args);
    }

    // Plural one
    options.pluralForm = true;
    let value: Array<string> = exist ? translation : [msgid, msgid_plural];
    return this.t(value, n, options, ...args);
  }

  /**
   * Split a locale into parent locales. "es-CO" -> ["es-CO", "es"]
   *
   * @param locale - The locale string.
   *
   * @return An array of locales.
   */
  private expandLocale(locale: string): Array<string> {
    let locales: Array<string> = [locale];
    let i: number = locale.lastIndexOf('-');
    while (i > 0) {
      locale = locale.slice(0, i);
      locales.push(locale);
      i = locale.lastIndexOf('-');
    }
    return locales;
  }

  /**
   * Split a locale into parent locales. "es-CO" -> ["es-CO", "es"]
   *
   * @param pluralForm - Plural form string..
   * @return An function to compute plural forms.
   */
  private getPluralFunc(pluralForm: string): Function {
    // Plural form string regexp
    // taken from https://github.com/Orange-OpenSource/gettext.js/blob/master/lib.gettext.js
    // plural forms list available here http://localization-guide.readthedocs.org/en/latest/l10n/pluralforms.html
    let pf_re = new RegExp(
      '^\\s*nplurals\\s*=\\s*[0-9]+\\s*;\\s*plural\\s*=\\s*(?:\\s|[-\\?\\|&=!<>+*/%:;n0-9_()])+'
    );

    if (!pf_re.test(pluralForm))
      throw new Error(
        Gettext.strfmt('The plural form "%1" is not valid', pluralForm)
      );

    // Careful here, this is a hidden eval() equivalent..
    // Risk should be reasonable though since we test the pluralForm through regex before
    // taken from https://github.com/Orange-OpenSource/gettext.js/blob/master/lib.gettext.js
    // TODO: should test if https://github.com/soney/jsep present and use it if so
    return new Function(
      'n',
      'let plural, nplurals; ' +
        pluralForm +
        ' return { nplurals: nplurals, plural: (plural === true ? 1 : (plural ? plural : 0)) };'
    );
  }

  /**
   * Remove the context delimiter from string.
   *
   * @param str - Translation string.
   * @return A translation string without context.
   */
  private removeContext(str: string): string {
    // if there is context, remove it
    if (str.indexOf(this._contextDelimiter) !== -1) {
      let parts = str.split(this._contextDelimiter);
      return parts[1];
    }
    return str;
  }

  /**
   * Proper translation function that handle plurals and directives.
   *
   * @param messages - List of translation strings.
   * @param n - The number for pluralization.
   * @param options - Translation options.
   * @param args - Any variables to interpolate.
   *
   * @return A translation string without context.
   *
   * ### Notes
   * Contains juicy parts of https://github.com/Orange-OpenSource/gettext.js/blob/master/lib.gettext.js
   */
  private t(
    messages: Array<string>,
    n: number,
    options: ITOptions,
    ...args: any[]
  ): string {
    // Singular is very easy, just pass dictionary message through strfmt
    if (!options.pluralForm)
      return Gettext.strfmt(this.removeContext(messages[0]), ...args);

    let plural;

    // if a plural func is given, use that one
    if (options.pluralFunc) {
      plural = options.pluralFunc(n);

      // if plural form never interpreted before, do it now and store it
    } else if (!this._pluralFuncs[options.locale || '']) {
      this._pluralFuncs[options.locale || ''] = this.getPluralFunc(
        this._pluralForms[options.locale || '']
      );
      plural = this._pluralFuncs[options.locale || ''](n);

      // we have the plural function, compute the plural result
    } else {
      plural = this._pluralFuncs[options.locale || ''](n);
    }

    // If there is a problem with plurals, fallback to singular one
    if (
      'undefined' === typeof !plural.plural ||
      plural.plural > plural.nplurals ||
      messages.length <= plural.plural
    )
      plural.plural = 0;

    return Gettext.strfmt(
      this.removeContext(messages[plural.plural]),
      ...[n].concat(args)
    );
  }

  /**
   * Set messages after loading them.
   *
   * @param domain - The translation domain.
   * @param locale - The translation locale.
   * @param messages - List of translation strings.
   * @param pluralForms - Plural form string.
   *
   * ### Notes
   * Contains juicy parts of https://github.com/Orange-OpenSource/gettext.js/blob/master/lib.gettext.js
   */
  private setMessages(
    domain: string,
    locale: string,
    messages: IJsonDataMessages,
    pluralForms: string
  ): void {
    if (pluralForms) this._pluralForms[locale] = pluralForms;

    if (!this._dictionary[domain]) this._dictionary[domain] = {};

    this._dictionary[domain][locale] = messages;
  }

  private _pluralForms: any;
  private _dictionary: any;
  private _locale: string;
  private _domain: string;
  private _contextDelimiter: string;
  private _pluralFuncs: any;
  private _defaults: any;
}

export { Gettext };
