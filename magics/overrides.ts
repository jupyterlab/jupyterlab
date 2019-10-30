export interface IMagicOverride {
  pattern: string;
  replacement: string;
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
