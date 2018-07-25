// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IInstanceTracker, ISanitizer } from '@jupyterlab/apputils';

import { CodeCell, CodeCellModel, MarkdownCell } from '@jupyterlab/cells';

import { IDocumentWidget, MimeDocument } from '@jupyterlab/docregistry';

import { FileEditor, IEditorTracker } from '@jupyterlab/fileeditor';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { each } from '@phosphor/algorithm';

import { TableOfContentsRegistry } from './registry';

import { IHeading, TableOfContents } from './toc';

const VDOM_MIME_TYPE = 'application/vdom.v1+json';

const HTML_MIME_TYPE = 'text/html';

let currentLevel = 1;

/**
 * Create a TOC generator for notebooks.
 *
 * @param tracker: A notebook tracker.
 *
 * @returns A TOC generator that can parse notebooks.
 */
export function createNotebookGenerator(
  tracker: INotebookTracker,
  sanitizer: ISanitizer,
  widget: TableOfContents | null = null,
  needNumbering = true
): TableOfContentsRegistry.IGenerator<NotebookPanel> {
  return {
    tracker,
    usesLatex: true,
    generate: panel => {
      let headings: IHeading[] = [];
      let numberingDict: { [level: number]: number } = {};
      each(panel.content.widgets, cell => {
        let model = cell.model;
        // Only parse markdown cells or code cell outputs
        if (model.type === 'code') {
          // Iterate over the outputs, and parse them if they
          // are rendered markdown or HTML.
          let text = (model as CodeCellModel).value.text;
          const onClickFactory2 = (line: number) => {
            return () => {
              cell.node.scrollIntoView();
            };
          };
          headings = headings.concat(
            Private.getCodeCells(
              text,
              onClickFactory2,
              numberingDict,
              currentLevel
            )
          );
          for (let i = 0; i < (model as CodeCellModel).outputs.length; i++) {
            // Filter out the outputs that are not rendered HTML
            // (that is, markdown, vdom, or text/html)
            const outputModel = (model as CodeCellModel).outputs.get(i);
            const dataTypes = Object.keys(outputModel.data);
            const htmlData = dataTypes.filter(
              t => Private.isMarkdown(t) || Private.isDOM(t)
            );
            if (!htmlData.length) {
              continue;
            }
            // If the output has rendered HTML, parse it for headers.
            const outputWidget = (cell as CodeCell).outputArea.widgets[i];
            const onClickFactory = (el: Element) => {
              return () => {
                el.scrollIntoView();
              };
            };
            headings = headings.concat(
              Private.getRenderedHTMLHeadings(
                outputWidget.node,
                onClickFactory,
                sanitizer,
                numberingDict
              )
            );
          }
        } else if (model.type === 'markdown') {
          // If the cell is rendered, generate the ToC items from
          // the HTML. If it is not rendered, generate them from
          // the text of the cell.
          if ((cell as MarkdownCell).rendered) {
            const onClickFactory = (el: Element) => {
              return () => {
                if (!(cell as MarkdownCell).rendered) {
                  cell.node.scrollIntoView();
                } else {
                  el.scrollIntoView();
                }
              };
            };
            let numbering = true;
            if (widget != null) {
              numbering = widget.needNumbering;
            }
            headings = headings.concat(
              Private.getRenderedHTMLHeadings(
                cell.node,
                onClickFactory,
                sanitizer,
                numberingDict,
                numbering
              )
            );
            currentLevel = headings[headings.length - 1]['level'];
          } else {
            const onClickFactory = (line: number) => {
              return () => {
                cell.node.scrollIntoView();
                if (!(cell as MarkdownCell).rendered) {
                  cell.editor.setCursorPosition({ line, column: 0 });
                }
              };
            };
            headings = headings.concat(
              Private.getMarkdownHeadings(
                model.value.text,
                onClickFactory,
                numberingDict
              )
            );
          }
        }
      });
      // for (let i = 0; i < headings.length - 1; i++) {
      //   if (headings[i + 1].level < headings[i].level) {
      //     console.log('has a child!');
      //   }
      // }
      return headings;
    }
  };
}

/**
 * Create a TOC generator for markdown files.
 *
 * @param tracker: A file editor tracker.
 *
 * @returns A TOC generator that can parse markdown files.
 */
export function createMarkdownGenerator(
  tracker: IEditorTracker
): TableOfContentsRegistry.IGenerator<IDocumentWidget<FileEditor>> {
  return {
    tracker,
    usesLatex: true,
    isEnabled: editor => {
      // Only enable this if the editor mimetype matches
      // one of a few markdown variants.
      return Private.isMarkdown(editor.content.model.mimeType);
    },
    generate: editor => {
      let model = editor.content.model;
      let onClickFactory = (line: number) => {
        return () => {
          editor.content.editor.setCursorPosition({ line, column: 0 });
        };
      };
      return Private.getMarkdownHeadings(
        model.value.text,
        onClickFactory,
        null
      );
    }
  };
}

/**
 * Create a TOC generator for rendered markdown files.
 *
 * @param tracker: A file editor tracker.
 *
 * @returns A TOC generator that can parse markdown files.
 */
export function createRenderedMarkdownGenerator(
  tracker: IInstanceTracker<MimeDocument>,
  sanitizer: ISanitizer
): TableOfContentsRegistry.IGenerator<MimeDocument> {
  return {
    tracker,
    usesLatex: true,
    isEnabled: widget => {
      // Only enable this if the editor mimetype matches
      // one of a few markdown variants.
      return Private.isMarkdown(widget.content.mimeType);
    },
    generate: widget => {
      const onClickFactory = (el: Element) => {
        return () => {
          el.scrollIntoView();
        };
      };
      return Private.getRenderedHTMLHeadings(
        widget.content.node,
        onClickFactory,
        sanitizer,
        null
      );
    }
  };
}

/**
 * Create a TOC generator for LaTeX files.
 *
 * @param tracker: A file editor tracker.
 *
 * @returns A TOC generator that can parse LaTeX files.
 */
export function createLatexGenerator(
  tracker: IEditorTracker
): TableOfContentsRegistry.IGenerator<IDocumentWidget<FileEditor>> {
  return {
    tracker,
    usesLatex: true,
    isEnabled: editor => {
      // Only enable this if the editor mimetype matches
      // one of a few LaTeX variants.
      let mime = editor.content.model.mimeType;
      return mime === 'text/x-latex' || mime === 'text/x-stex';
    },
    generate: editor => {
      let headings: IHeading[] = [];
      let model = editor.content.model;

      // Split the text into lines, with the line number for each.
      // We will use the line number to scroll the editor upon
      // TOC item click.
      const lines = model.value.text.split('\n').map((value, idx) => {
        return { value, idx };
      });

      // Iterate over the lines to get the header level and
      // the text for the line.
      lines.forEach(line => {
        const match = line.value.match(
          /^\s*\\(section|subsection|subsubsection){(.+)}/
        );
        if (match) {
          const level = Private.latexLevels[match[1]];
          const text = match[2];
          const onClick = () => {
            editor.content.editor.setCursorPosition({
              line: line.idx,
              column: 0
            });
          };
          headings.push({ text, level, onClick });
        }
      });
      return headings;
    }
  };
}

/**
 * A private namespace for miscellaneous things.
 */
namespace Private {
  export function incrementNumberingDict(dict: any, level: number) {
    if (dict[level + 1] != undefined) {
      dict[level + 1] = undefined;
    }
    if (dict[level] === undefined) {
      dict[level] = 1;
    } else {
      dict[level]++;
    }
  }

  export function generateNumbering(numberingDict: any, level: number) {
    let numbering = undefined;
    if (numberingDict != null) {
      Private.incrementNumberingDict(numberingDict, level);
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
   * Given a string of markdown, get the markdown headings
   * in that string.
   */
  export function getMarkdownHeadings(
    text: string,
    onClickFactory: (line: number) => (() => void),
    numberingDict: any
  ): IHeading[] {
    // Split the text into lines.
    const lines = text.split('\n');
    let headings: IHeading[] = [];

    // Iterate over the lines to get the header level and
    // the text for the line.
    lines.forEach((line, idx) => {
      // Make an onClick handler for this line.
      const onClick = onClickFactory(idx);

      // First test for '#'-style headers.
      let match = line.match(/^([#]{1,6}) (.*)/);
      if (match) {
        const level = match[1].length;
        // Take special care to parse markdown links into raw text.
        const text = match[2].replace(/\[(.+)\]\(.+\)/g, '$1');
        let numbering = Private.generateNumbering(numberingDict, level);
        headings.push({ text, level, numbering, onClick });
        return;
      }

      // Next test for '==='-style headers.
      match = line.match(/^([=]{2,}|[-]{2,})/);
      if (match && idx > 0) {
        const level = match[1][0] === '=' ? 1 : 2;
        // Take special care to parse markdown links into raw text.
        const text = lines[idx - 1].replace(/\[(.+)\]\(.+\)/g, '$1');
        let numbering = Private.generateNumbering(numberingDict, level);
        headings.push({ text, level, numbering, onClick });
        return;
      }

      // Finally test for HTML headers. This will not catch multiline
      // headers, nor will it catch multiple headers on the same line.
      // It should do a decent job of catching many, though.
      match = line.match(/<h([1-6])>(.*)<\/h\1>/i);
      if (match) {
        const level = parseInt(match[1], 10);
        const text = match[2];
        let numbering = Private.generateNumbering(numberingDict, level);
        headings.push({ text, level, numbering, onClick });
      }
    });
    return headings;
  }

  export function getCodeCells(
    text: string,
    onClickFactory: (line: number) => (() => void),
    numberingDict: any,
    lastLevel: number
  ): IHeading[] {
    let headings: IHeading[] = [];
    if (text) {
      const onClick = onClickFactory(0);
      const level = lastLevel + 1;
      let numbering = Private.generateNumbering(numberingDict, level);
      headings.push({ text, level, numbering, onClick });
    }
    return headings;
  }
  /**
   * Given an HTML element, generate ToC headings
   * by finding all the headers and making IHeading objects for them.
   */
  export function getRenderedHTMLHeadings(
    node: HTMLElement,
    onClickFactory: (el: Element) => (() => void),
    sanitizer: ISanitizer,
    numberingDict: any,
    needNumbering = true
  ): IHeading[] {
    let headings: IHeading[] = [];
    let headingNodes = node.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (let i = 0; i < headingNodes.length; i++) {
      const heading = headingNodes[i];
      const level = parseInt(heading.tagName[1]);
      const text = heading.textContent;
      let shallHide = !needNumbering;
      if (heading.getElementsByClassName('numbering-entry').length > 0) {
        heading.removeChild(
          heading.getElementsByClassName('numbering-entry')[0]
        );
      }
      let html = sanitizer.sanitize(heading.innerHTML, sanitizerOptions);
      html = html.replace('¶', ''); // Remove the anchor symbol.
      const onClick = onClickFactory(heading);
      let numbering = Private.generateNumbering(numberingDict, level);
      let numberingElement =
        '<span class="numbering-entry" ' +
        (shallHide ? ' hidden="true"' : '') +
        '>' +
        numbering +
        '</span>';
      heading.innerHTML = numberingElement + html;
      headings.push({ level, text, numbering, html, onClick });
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
   * A mapping from LaTeX section headers to HTML header
   * levels. `part` and `chapter` are less common in my experience,
   * so assign them to header level 1.
   */
  export const latexLevels: { [label: string]: number } = {
    part: 1, // Only available for report and book classes
    chapter: 1, // Only available for report and book classes
    section: 1,
    subsection: 2,
    subsubsection: 3,
    paragraph: 4,
    subparagraph: 5
  };

  /**
   * Allowed HTML tags for the ToC entries. We use this to
   * sanitize HTML headings, if they are given. We specifically
   * disallow anchor tags, since we are adding our own.
   */
  const sanitizerOptions = {
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
