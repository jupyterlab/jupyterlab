// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {ISanitizer} from '@jupyterlab/apputils';

import {FileEditor, IEditorTracker} from '@jupyterlab/fileeditor';

import {MarkdownCell} from '@jupyterlab/cells';

import {INotebookTracker, NotebookPanel} from '@jupyterlab/notebook';

import {each} from '@phosphor/algorithm';

import {TableOfContentsRegistry} from './registry';

import {IHeading} from './toc';

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
): TableOfContentsRegistry.IGenerator<NotebookPanel> {
  return {
    tracker,
    usesLatex: true,
    generate: panel => {
      let headings: IHeading[] = [];
      each(panel.notebook.widgets, cell => {
        let model = cell.model;
        // Only parse markdown cells
        if (model.type !== 'markdown') {
          return;
        }

        if ((cell as MarkdownCell).rendered) {
          headings = headings.concat(
            Private.getRenderedHTMLHeadings(cell.node, sanitizer),
          );
        } else {
          const onClickFactory = () => {
            return () => {
              cell.node.scrollIntoView();
            };
          };
          headings = headings.concat(
            Private.getMarkdownHeadings(model.value.text, onClickFactory),
          );
        }
      });
      return headings;
    },
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
  tracker: IEditorTracker,
): TableOfContentsRegistry.IGenerator<FileEditor> {
  return {
    tracker,
    usesLatex: true,
    isEnabled: editor => {
      // Only enable this if the editor mimetype matches
      // one of a few markdown variants.
      let mime = editor.model.mimeType;
      return (
        mime === 'text/x-ipthongfm' ||
        mime === 'text/x-markdown' ||
        mime === 'text/x-gfm' ||
        mime === 'text/markdown'
      );
    },
    generate: editor => {
      let model = editor.model;
      let onClickFactory = (line: number) => {
        return () => {
          editor.editor.setCursorPosition({line, column: 0});
        };
      };
      return Private.getMarkdownHeadings(model.value.text, onClickFactory);
    },
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
  tracker: IEditorTracker,
): TableOfContentsRegistry.IGenerator<FileEditor> {
  return {
    tracker,
    usesLatex: true,
    isEnabled: editor => {
      // Only enable this if the editor mimetype matches
      // one of a few LaTeX variants.
      let mime = editor.model.mimeType;
      return mime === 'text/x-latex' || mime === 'text/x-stex';
    },
    generate: editor => {
      let headings: IHeading[] = [];
      let model = editor.model;

      // Split the text into lines, with the line number for each.
      // We will use the line number to scroll the editor upon
      // TOC item click.
      const lines = model.value.text.split('\n').map((value, idx) => {
        return {value, idx};
      });

      // Iterate over the lines to get the header level and
      // the text for the line.
      lines.forEach(line => {
        const match = line.value.match(
          /^\s*\\(section|subsection|subsubsection){(.+)}/,
        );
        if (match) {
          const level = Private.latexLevels[match[1]];
          const text = match[2];
          const onClick = () => {
            editor.editor.setCursorPosition({line: line.idx, column: 0});
          };
          headings.push({text, level, onClick});
        }
      });
      return headings;
    },
  };
}

/**
 * A private namespace for miscellaneous things.
 */
namespace Private {
  /**
   * Given a string of markdown, get the markdown headings
   * in that string.
   */
  export function getMarkdownHeadings(
    text: string,
    onClickFactory: (line: number) => (() => void),
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
        headings.push({text, level, onClick});
        return;
      }

      // Next test for '==='-style headers.
      match = line.match(/^([=]{2,}|[-]{2,})/);
      if (match && idx > 0) {
        const level = match[1][0] === '=' ? 1 : 2;
        // Take special care to parse markdown links into raw text.
        const text = lines[idx - 1].replace(/\[(.+)\]\(.+\)/g, '$1');
        headings.push({text, level, onClick});
        return;
      }

      // Finally test for HTML headers. This will not catch multiline
      // headers, nor will it catch multiple headers on the same line.
      // It should do a decent job of catching many, though.
      match = line.match(/<h([1-6])>(.*)<\/h\1>/i);
      if (match) {
        const level = parseInt(match[1]);
        const text = match[2];
        headings.push({text, level, onClick});
      }
    });
    return headings;
  }

  /**
   * Given an HTML element, generate ToC headings
   * by finding all the headers and making IHeading objects for them.
   */
  export function getRenderedHTMLHeadings(
    node: HTMLElement,
    sanitizer: ISanitizer,
  ): IHeading[] {
    let headings: IHeading[] = [];
    let headingNodes = node.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (let i = 0; i < headingNodes.length; i++) {
      const heading = headingNodes[i];
      const level = parseInt(heading.tagName[1]);
      const text = heading.textContent;
      let html = sanitizer.sanitize(heading.innerHTML, sanitizerOptions);
      html = html.replace('¶', ''); // Remove the anchor symbol.

      const onClick = () => {
        heading.scrollIntoView();
      };
      headings.push({level, text, html, onClick});
    }
    return headings;
  }

  /**
   * A mapping from LaTeX section headers to HTML header
   * levels. `part` and `chapter` are less common in my experience,
   * so assign them to header level 1.
   */
  export const latexLevels: {[label: string]: number} = {
    part: 1, // Only available for report and book classes
    chapter: 1, // Only available for report and book classes
    section: 1,
    subsection: 2,
    subsubsection: 3,
    paragraph: 4,
    subparagraph: 5,
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
      'del',
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
      pre: ['class'],
    },
  };
}
