// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IHeading } from '../toc';

const VDOM_MIME_TYPE = 'application/vdom.v1+json';

const HTML_MIME_TYPE = 'text/html';

export interface INumberedHeading extends IHeading {
  numbering?: string | null;
}

/**
 * Given a dictionary that keep tracks of the numbering and the level,
 * update the dictionary.
 */
function incrementNumberingDict(dict: any, level: number) {
  if (dict[level + 1] != undefined) {
    dict[level + 1] = undefined;
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
 * Return whether the mime type is some flavor of markdown.
 */
export function isMarkdown(mime: string): boolean {
  return (
    mime === 'text/x-ipythongfm' ||
    mime === 'text/x-markdown' ||
    mime === 'text/x-gfm' ||
    mime === 'text/markdown'
  );
}

/**
 * Return whether the mime type is DOM-ish (html or vdom).
 */
export function isDOM(mime: string): boolean {
  return mime === VDOM_MIME_TYPE || mime === HTML_MIME_TYPE;
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
