// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDocumentWidget, MimeDocument } from '@jupyterlab/docregistry';

import { FileEditor, IEditorTracker } from '@jupyterlab/fileeditor';

import { TableOfContentsRegistry } from '../../registry';

import {
  generateNumbering,
  sanitizerOptions,
  isMarkdown,
  INotebookHeading,
  INotebookHeadingTypes
} from '../shared';

import { IInstanceTracker, ISanitizer } from '@jupyterlab/apputils';

import { MarkdownDocGeneratorOptionsManager } from './optionsmanager';

import { TableOfContents } from '../../toc';

import { markdownDocItemRenderer } from './itemrenderer';

import { markdownDocGeneratorToolbar } from './toolbargenerator';

/**
 * Create a TOC generator for markdown files.
 *
 * @param tracker: A file editor tracker.
 *
 * @returns A TOC generator that can parse markdown files.
 */
export function createMarkdownGenerator(
  tracker: IEditorTracker,
  widget: TableOfContents
): TableOfContentsRegistry.IGenerator<IDocumentWidget<FileEditor>> {
  // Create a option manager to manage user settings
  const options = new MarkdownDocGeneratorOptionsManager(widget, {
    needNumbering: true
  });
  return {
    tracker,
    usesLatex: true,
    options: options,
    toolbarGenerator: () => {
      return markdownDocGeneratorToolbar(options);
    },
    itemRenderer: (item: INotebookHeading) => {
      return markdownDocItemRenderer(options, item);
    },
    isEnabled: editor => {
      // Only enable this if the editor mimetype matches
      // one of a few markdown variants.
      return isMarkdown(editor.content.model.mimeType);
    },
    generate: editor => {
      let numberingDict: { [level: number]: number } = {};
      let model = editor.content.model;
      let onClickFactory = (line: number) => {
        return () => {
          editor.content.editor.setCursorPosition({ line, column: 0 });
        };
      };
      return Private.getMarkdownDocHeadings(
        model.value.text,
        onClickFactory,
        numberingDict
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
  sanitizer: ISanitizer,
  widget: TableOfContents
): TableOfContentsRegistry.IGenerator<MimeDocument> {
  const options = new MarkdownDocGeneratorOptionsManager(widget, {
    needNumbering: true
  });
  return {
    tracker,
    usesLatex: true,
    options: options,
    toolbarGenerator: widget => {
      return markdownDocGeneratorToolbar(options);
    },
    itemRenderer: (item: INotebookHeading) => {
      return markdownDocItemRenderer(options, item);
    },
    isEnabled: widget => {
      // Only enable this if the editor mimetype matches
      // one of a few markdown variants.
      return isMarkdown(widget.content.mimeType);
    },
    generate: widget => {
      let numberingDict: { [level: number]: number } = {};
      const onClickFactory = (el: Element) => {
        return () => {
          el.scrollIntoView();
        };
      };
      return Private.getRenderedHTMLHeadingsForMarkdownDoc(
        widget.content.node,
        onClickFactory,
        sanitizer,
        numberingDict
      );
    }
  };
}

/**
 * A private namespace for miscellaneous things.
 */
namespace Private {
  export function getMarkdownDocHeadings(
    text: string,
    onClickFactory: (line: number) => (() => void),
    numberingDict: { [level: number]: number }
  ): INotebookHeading[] {
    // Split the text into lines.
    const lines = text.split('\n');
    let headings: INotebookHeading[] = [];

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
        let numbering = generateNumbering(numberingDict, level);
        headings.push({
          text,
          numbering,
          level,
          onClick,
          type: INotebookHeadingTypes.header
        });
        return;
      }

      // Next test for '==='-style headers.
      match = line.match(/^([=]{2,}|[-]{2,})/);
      if (match && idx > 0) {
        const level = match[1][0] === '=' ? 1 : 2;
        // Take special care to parse markdown links into raw text.
        const text = lines[idx - 1].replace(/\[(.+)\]\(.+\)/g, '$1');
        let numbering = generateNumbering(numberingDict, level);
        headings.push({
          text,
          numbering,
          level,
          onClick,
          type: INotebookHeadingTypes.header
        });
        return;
      }

      // Finally test for HTML headers. This will not catch multiline
      // headers, nor will it catch multiple headers on the same line.
      // It should do a decent job of catching many, though.
      match = line.match(/<h([1-6])>(.*)<\/h\1>/i);
      if (match) {
        const level = parseInt(match[1], 10);
        const text = match[2];
        let numbering = generateNumbering(numberingDict, level);
        headings.push({
          text,
          numbering,
          level,
          onClick,
          type: INotebookHeadingTypes.header
        });
        return;
      }
    });
    return headings;
  }
}

namespace Private {
  /**
   * Given a HTML DOM element, get the markdown headings
   * in that string.
   */
  export function getRenderedHTMLHeadingsForMarkdownDoc(
    node: HTMLElement,
    onClickFactory: (el: Element) => (() => void),
    sanitizer: ISanitizer,
    numberingDict: { [level: number]: number },
    needNumbering = true
  ): INotebookHeading[] {
    let headings: INotebookHeading[] = [];
    let headingNodes = node.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (let i = 0; i < headingNodes.length; i++) {
      const heading = headingNodes[i];
      const level = parseInt(heading.tagName[1]);
      let text = heading.textContent ? heading.textContent : '';
      let shallHide = !needNumbering;

      // Show/hide numbering DOM element based on user settings
      if (heading.getElementsByClassName('numbering-entry').length > 0) {
        heading.removeChild(
          heading.getElementsByClassName('numbering-entry')[0]
        );
      }
      let html = sanitizer.sanitize(heading.innerHTML, sanitizerOptions);
      html = html.replace('¶', ''); // Remove the anchor symbol.
      const onClick = onClickFactory(heading);

      // Get the numbering string
      let numbering = generateNumbering(numberingDict, level);

      // Generate the DOM element for numbering
      let numberingElement =
        '<span class="numbering-entry" ' +
        (shallHide ? ' hidden="true"' : '') +
        '>' +
        numbering +
        '</span>';

      // Add DOM numbering element to document
      heading.innerHTML = numberingElement + html;
      text = text.replace('¶', '');
      headings.push({
        level,
        text,
        numbering,
        html,
        onClick,
        type: INotebookHeadingTypes.header
      });
    }
    return headings;
  }
}
