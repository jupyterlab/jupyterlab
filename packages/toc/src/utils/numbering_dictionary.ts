// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * Interface describing a numbering dictionary.
 *
 * @private
 */
interface INumberingDictionary {
  /**
   * Level numbering.
   */
  [level: number]: number;
}

/**
 * Exports.
 */
export { INumberingDictionary };
