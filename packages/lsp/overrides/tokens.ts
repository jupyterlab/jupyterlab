import { Token } from '@lumino/coreutils';

import { LanguageIdentifier } from '../lsp';
import { PLUGIN_ID } from '../tokens';

export type replacer = (...args: string[]) => string;

export type OverrideScope =
  | /**
   * Overrides for kernel-specific constructs contained to a single cell, such as cell magics in IPython.
   * If a match for expresion in the key is found at the beginning of a cell, the entire cell is replaced with the value.
   */
  'cell'
  /**
   * Overrides for kernel-specific constructs contained to a single line, such as line magics in IPython.
   * If a match for expresion in the key is found against a line, the line is replaced with the value.
   */
  | 'line';

/**
 * The expressions will be tested in the order of definition
 */
export interface ICodeOverride {
  pattern: string;
  replacement: string | replacer;
  reverse?: this;
}

export interface ICodeOverridesRegistry {
  [language: string]: {
    cell: ICodeOverride[];
    line: ICodeOverride[];
  };
}

export interface IScopedCodeOverride extends ICodeOverride {
  scope: OverrideScope;
}

/**
 * Interactive kernels often provide additional functionality invoked by so-called magics,
 * which use distinctive syntax. This features may however not be interpreted correctly by
 * the general purpose language linters. To avoid false-positives making the linter useless
 * for any specific language when magics are used, regular expressions can be used to replace
 * the magics with linter-friendly substitutes; this will be made user configurable.
 */
export interface ILSPCodeOverridesManager {
  readonly registry: ICodeOverridesRegistry;
  /**
   * Register a code override to replace code fragments in documents of specified language.
   */
  register(override: IScopedCodeOverride, language: LanguageIdentifier): void;
}

export const ILSPCodeOverridesManager = new Token<ILSPCodeOverridesManager>(
  PLUGIN_ID + ':ILSPCodeOverridesManager'
);
