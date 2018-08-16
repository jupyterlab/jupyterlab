import { ISanitizer } from '@jupyterlab/apputils';
import { Cell } from '@jupyterlab/cells';
import { IHeading } from '../toc';

const VDOM_MIME_TYPE = 'application/vdom.v1+json';

const HTML_MIME_TYPE = 'text/html';

export interface INotebookHeading extends IHeading {
  numbering?: string | null;
  type: string;
  prompt?: string;
  cellRef?: Cell;
  hasChild?: boolean;
}

export class SharedMethods {
  static incrementNumberingDict(dict: any, level: number) {
    if (dict[level + 1] != undefined) {
      dict[level + 1] = undefined;
    }
    if (dict[level] === undefined) {
      dict[level] = 1;
    } else {
      dict[level]++;
    }
  }

  static generateNumbering(numberingDict: any, level: number) {
    let numbering = undefined;
    if (numberingDict != null) {
      this.incrementNumberingDict(numberingDict, level);
      numbering = '';
      for (var j = 1; j <= level; j++) {
        numbering +=
          (numberingDict[j] == undefined ? '0' : numberingDict[j]) + '.';
        if (j == level) {
          numbering += ' ';
        }
      }
    }
    return numbering;
  }

  /**
   * Given an HTML element, generate ToC headings
   * by finding all the headers and making IHeading objects for them.
   */
  static getRenderedHTMLHeadings(
    node: HTMLElement,
    onClickFactory: (el: Element) => (() => void),
    sanitizer: ISanitizer,
    numberingDict: any,
    lastLevel: number,
    needNumbering = false,
    cellRef?: Cell
  ): INotebookHeading[] {
    let headings: INotebookHeading[] = [];
    let headingNodes = node.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
    if (headingNodes.length > 0) {
      let markdownCell = headingNodes[0];
      if (markdownCell.nodeName.toLowerCase() === 'p') {
        if (markdownCell.innerHTML) {
          headings.push({
            level: lastLevel + 1,
            html: markdownCell.innerHTML,
            text: markdownCell.textContent,
            onClick: onClickFactory(markdownCell),
            type: 'markdown',
            cellRef: cellRef,
            hasChild: true
          });
        }
      } else {
        const heading = headingNodes[0];
        const level = parseInt(heading.tagName[1]);
        const text = heading.textContent;
        let shallHide = !needNumbering;
        if (heading.getElementsByClassName('numbering-entry').length > 0) {
          heading.removeChild(
            heading.getElementsByClassName('numbering-entry')[0]
          );
        }
        let html = sanitizer.sanitize(
          heading.innerHTML,
          SharedConstants.sanitizerOptions
        );
        html = html.replace('¶', ''); // Remove the anchor symbol.
        const onClick = onClickFactory(heading);
        let numbering = SharedMethods.generateNumbering(numberingDict, level);
        let numberingElement =
          '<span class="numbering-entry" ' +
          (shallHide ? ' hidden="true"' : '') +
          '>' +
          numbering +
          '</span>';
        heading.innerHTML = numberingElement + html;
        headings.push({
          level,
          text,
          numbering,
          html,
          onClick,
          type: 'header',
          cellRef: cellRef,
          hasChild: true
        });
      }
    }
    return headings;
  }

  /**
   * Given a string of markdown, get the markdown headings
   * in that string.
   */
  static getMarkdownHeadings(
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
      let numbering = SharedMethods.generateNumbering(numberingDict, level);
      headings.push({
        text,
        level,
        numbering,
        onClick,
        type: 'header',
        cellRef: cellRef,
        hasChild: true
      });
    }

    // Next test for '==='-style headers.
    else if (match2 && idx > 0) {
      const level = match2[1][0] === '=' ? 1 : 2;
      // Take special care to parse markdown links into raw text.
      const text = lines[idx - 1].replace(/\[(.+)\]\(.+\)/g, '$1');
      let numbering = SharedMethods.generateNumbering(numberingDict, level);
      headings.push({
        text,
        level,
        numbering,
        onClick,
        type: 'header',
        cellRef: cellRef,
        hasChild: true
      });
    }

    // Finally test for HTML headers. This will not catch multiline
    // headers, nor will it catch multiple headers on the same line.
    // It should do a decent job of catching many, though.
    else if (match3) {
      const level = parseInt(match3[1], 10);
      const text = match3[2];
      let numbering = SharedMethods.generateNumbering(numberingDict, level);
      headings.push({
        text,
        level,
        numbering,
        onClick,
        type: 'header',
        cellRef: cellRef,
        hasChild: true
      });
    } else {
      headings.push({
        text: line,
        level: lastLevel + 1,
        onClick,
        type: 'markdown',
        cellRef: cellRef,
        hasChild: false
      });
    }
    return headings;
  }

  /**
   * Return whether the mime type is some flavor of markdown.
   */
  static isMarkdown(mime: string): boolean {
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
  static isDOM(mime: string): boolean {
    return mime === VDOM_MIME_TYPE || mime === HTML_MIME_TYPE;
  }
}

export namespace SharedConstants {
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
}
