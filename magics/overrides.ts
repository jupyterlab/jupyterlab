export type replacer = (...args: string[]) => string;

export interface IMagicOverrideRule {
  pattern: string;
  replacement: string | replacer;
}

export interface IMagicOverride extends IMagicOverrideRule {
  reverse: IMagicOverrideRule;
}

/**
 * The expressions will be tested in the order of definition
 */
export interface ILanguageMagicsOverrides {
  line_magics?: IMagicOverride[];
  cell_magics?: IMagicOverride[];
}

export interface IOverridesRegistry {
  [language: string]: ILanguageMagicsOverrides;
}
