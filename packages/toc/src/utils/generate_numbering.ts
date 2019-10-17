// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * Given a dictionary that keep tracks of the numbering and the level,
 * update the dictionary.
 */
function incrementNumberingDict(dict: any, level: number) {
  let x = level + 1;
  while (x <= 6) {
    if (dict[x] != undefined) {
      dict[x] = undefined;
    }
    x++;
  }
  if (dict[level] === undefined) {
    dict[level] = 1;
  } else {
    dict[level]++;
  }
}

/**
 * Given a dictionary that keep tracks of the numbering and the current level,
 * generate the current numbering based on the dictionary and current level.
 */
export function generateNumbering(
  numberingDict: { [level: number]: number },
  level: number
) {
  let numbering = undefined;
  if (numberingDict != null) {
    incrementNumberingDict(numberingDict, level);
    numbering = '';
    for (let j = 1; j <= level; j++) {
      numbering +=
        (numberingDict[j] == undefined ? '0' : numberingDict[j]) + '.';
      if (j === level) {
        numbering += ' ';
      }
    }
  }
  return numbering;
}
