// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { INumberingDictionary } from './numbering_dictionary';

// Maximum heading level:
const MAX_HEADING_LEVEL = 6;

/**
 * Updates numbering dictionary levels.
 *
 * ## Notes
 *
 * -   Mutates a provided dictionary.
 *
 * @private
 * @param dict - numbering dictionary
 * @param level - current level
 * @returns input dictionary
 */
function update(dict: any, level: number) {
  for (let l = level + 1; l <= MAX_HEADING_LEVEL; l++) {
    if (dict[l] !== void 0) {
      dict[l] = void 0;
    }
  }
  if (dict[level] === void 0) {
    dict[level] = 1;
  } else {
    dict[level] += 1;
  }
  return dict;
}

/**
 * Generate the current numbering based on a provided numbering dictionary and the current level.
 *
 * @private
 * @param dict - numbering dictionary
 * @param level - current level
 * @returns numbering
 */
function generateNumbering(
  dict: INumberingDictionary,
  level: number
): string | undefined {
  if (dict === null) {
    return;
  }
  let numbering = '';
  dict = update(dict, level);
  if (level >= 1) {
    for (let j = 1; j <= level; j++) {
      numbering += (dict[j] === void 0 ? '0' : dict[j]) + '.';
    }
    numbering += ' ';
  }
  return numbering;
}

/**
 * Exports.
 */
export { generateNumbering };
