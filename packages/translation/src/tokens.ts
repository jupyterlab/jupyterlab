/* ----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

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
  async fetch(opts: { language: string }): Promise<Language> {
    return requestTranslationsAPI(opts.language);
  }
}

export type TranslationBundle = {
  __(msgid: string, ...args: any[]): string;
  _n(msgid: string, msgid_plural: string, n: number, ...args: any[]): string;
  _p(msgctxt: string, msgid: string, ...args: any[]): string;
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
