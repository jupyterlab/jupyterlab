// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IHeading } from '../toc';

export interface INumberedHeading extends IHeading {
  numbering?: string | null;
}

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

/**
 * Allowed HTML tags for the ToC entries. We use this to
 * sanitize HTML headings, if they are given. We specifically
 * disallow anchor tags, since we are adding our own.
 */
export const sanitizerOptions = {
  allowedTags: [
    'p',
    'blockquote',
    'b',
    'i',
    'strong',
    'em',
    'strike',
    'code',
    'br',
    'div',
    'span',
    'pre',
    'del'
  ],
  allowedAttributes: {
    // Allow "class" attribute for <code> tags.
    code: ['class'],
    // Allow "class" attribute for <span> tags.
    span: ['class'],
    // Allow "class" attribute for <div> tags.
    div: ['class'],
    // Allow "class" attribute for <p> tags.
    p: ['class'],
    // Allow "class" attribute for <pre> tags.
    pre: ['class']
  }
};
