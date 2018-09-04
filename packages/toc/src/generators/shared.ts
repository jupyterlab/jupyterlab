import { Cell } from '@jupyterlab/cells';
import { IHeading } from '../toc';

const VDOM_MIME_TYPE = 'application/vdom.v1+json';

const HTML_MIME_TYPE = 'text/html';

export enum INotebookHeadingTypes {
  header,
  markdown,
  code
}

export interface INotebookHeading extends INumberedHeading {
  type: INotebookHeadingTypes;
  prompt?: string;
  cellRef?: Cell;
  hasChild?: boolean;
}

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
 * Given a string of markdown, get the markdown headings
 * in that string.
 */
export function getMarkdownHeadings(
  text: string,
  onClickFactory: (line: number) => (() => void),
  numberingDict: any,
  lastLevel: number,
  cellRef: Cell
): INotebookHeading[] {
  // Split the text into lines.
  const lines = text.split('\n');
  let headings: INotebookHeading[] = [];
  // Iterate over the lines to get the header level and
  // the text for the line.
  let line = lines[0];
  let idx = 0;
  // Make an onClick handler for this line.
  const onClick = onClickFactory(idx);

  // First test for '#'-style headers.
  let match = line.match(/^([#]{1,6}) (.*)/);
  let match2 = line.match(/^([=]{2,}|[-]{2,})/);
  let match3 = line.match(/<h([1-6])>(.*)<\/h\1>/i);
  if (match) {
    const level = match[1].length;
    // Take special care to parse markdown links into raw text.
    const text = match[2].replace(/\[(.+)\]\(.+\)/g, '$1');
    let numbering = generateNumbering(numberingDict, level);
    headings.push({
      text,
      level,
      numbering,
      onClick,
      type: INotebookHeadingTypes.header,
      cellRef: cellRef,
      hasChild: true
    });
  } else if (match2 && idx > 0) {
    // Next test for '==='-style headers.
    const level = match2[1][0] === '=' ? 1 : 2;
    // Take special care to parse markdown links into raw text.
    const text = lines[idx - 1].replace(/\[(.+)\]\(.+\)/g, '$1');
    let numbering = generateNumbering(numberingDict, level);
    headings.push({
      text,
      level,
      numbering,
      onClick,
      type: INotebookHeadingTypes.header,
      cellRef: cellRef,
      hasChild: true
    });
  } else if (match3) {
    // Finally test for HTML headers. This will not catch multiline
    // headers, nor will it catch multiple headers on the same line.
    // It should do a decent job of catching many, though.
    const level = parseInt(match3[1], 10);
    const text = match3[2];
    let numbering = generateNumbering(numberingDict, level);
    headings.push({
      text,
      level,
      numbering,
      onClick,
      type: INotebookHeadingTypes.header,
      cellRef: cellRef,
      hasChild: true
    });
  } else {
    headings.push({
      text: line,
      level: lastLevel + 1,
      onClick,
      type: INotebookHeadingTypes.markdown,
      cellRef: cellRef,
      hasChild: false
    });
  }
  return headings;
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
