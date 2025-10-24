// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Gettext } from './gettext';
import {
  DEFAULT_LANGUAGE_CODE,
  ITranslator,
  TranslationBundle
} from './tokens';

/**
 * A translator that loads a dummy language bundle that returns the same input
 * strings.
 */
export class NullTranslator implements ITranslator {
  constructor(bundle: TranslationBundle) {
    this._languageBundle = bundle;
  }

  readonly languageCode: string = DEFAULT_LANGUAGE_CODE;

  load(domain: string): TranslationBundle {
    return this._languageBundle;
  }

  private _languageBundle: TranslationBundle;
}

/**
 * A language bundle that returns the same input strings.
 */
class NullLanguageBundle {
  __(msgid: string, ...args: any[]): string {
    return this.gettext(msgid, ...args);
  }

  _n(msgid: string, msgid_plural: string, n: number, ...args: any[]): string {
    return this.ngettext(msgid, msgid_plural, n, ...args);
  }

  _p(msgctxt: string, msgid: string, ...args: any[]): string {
    return this.pgettext(msgctxt, msgid, ...args);
  }

  _np(
    msgctxt: string,
    msgid: string,
    msgid_plural: string,
    n: number,
    ...args: any[]
  ): string {
    return this.npgettext(msgctxt, msgid, msgid_plural, n, ...args);
  }

  gettext(msgid: string, ...args: any[]): string {
    return Gettext.strfmt(msgid, ...args);
  }

  ngettext(
    msgid: string,
    msgid_plural: string,
    n: number,
    ...args: any[]
  ): string {
    return Gettext.strfmt(n == 1 ? msgid : msgid_plural, ...[n].concat(args));
  }

  pgettext(msgctxt: string, msgid: string, ...args: any[]): string {
    return Gettext.strfmt(msgid, ...args);
  }

  npgettext(
    msgctxt: string,
    msgid: string,
    msgid_plural: string,
    n: number,
    ...args: any[]
  ): string {
    return this.ngettext(msgid, msgid_plural, n, ...args);
  }

  dcnpgettext(
    domain: string,
    msgctxt: string,
    msgid: string,
    msgid_plural: string,
    n: number,
    ...args: any[]
  ): string {
    return this.ngettext(msgid, msgid_plural, n, ...args);
  }
}

/**
 * The application null translator instance that just returns the same text.
 * Also provides interpolation.
 */
export const nullTranslator = new NullTranslator(new NullLanguageBundle());
