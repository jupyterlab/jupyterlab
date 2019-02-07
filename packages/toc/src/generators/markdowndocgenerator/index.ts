// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISanitizer } from '@jupyterlab/apputils';

import { IDocumentWidget } from '@jupyterlab/docregistry';

import { FileEditor, IEditorTracker } from '@jupyterlab/fileeditor';

import {
  IMarkdownViewerTracker,
  MarkdownDocument
} from '@jupyterlab/markdownviewer';

import { TableOfContentsRegistry } from '../../registry';

import {
  generateNumbering,
  sanitizerOptions,
  isMarkdown,
  INumberedHeading
} from '../shared';

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
  widget: TableOfContents,
  sanitizer: ISanitizer
): TableOfContentsRegistry.IGenerator<IDocumentWidget<FileEditor>> {
  // Create a option manager to manage user settings
  const options = new MarkdownDocGeneratorOptionsManager(widget, {
    needsNumbering: true,
    sanitizer
  });
  return {
    tracker,
    usesLatex: true,
    options: options,
    toolbarGenerator: () => {
      return markdownDocGeneratorToolbar(options);
    },
    itemRenderer: (item: INumberedHeading) => {
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
  tracker: IMarkdownViewerTracker,
  sanitizer: ISanitizer,
  widget: TableOfContents
): TableOfContentsRegistry.IGenerator<MarkdownDocument> {
  const options = new MarkdownDocGeneratorOptionsManager(widget, {
    needsNumbering: true,
    sanitizer
  });
  return {
    tracker,
    usesLatex: true,
    options: options,
    toolbarGenerator: () => {
      return markdownDocGeneratorToolbar(options);
    },
    itemRenderer: (item: INumberedHeading) => {
      return markdownDocItemRenderer(options, item);
    },
    generate: widget => {
      let numberingDict: { [level: number]: number } = {};
      return Private.getRenderedHTMLHeadingsForMarkdownDoc(
        widget.content.node,
        sanitizer,
        numberingDict,
        options.numbering
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
  ): INumberedHeading[] {
    // Split the text into lines.
    const lines = text.split('\n');
    let headings: INumberedHeading[] = [];

    let inCodeBlock = false;
    // Iterate over the lines to get the header level and
    // the text for the line.
    lines.forEach((line, idx) => {
      // Don't check for markdown headings if we
      // are in a code block (demarcated by backticks).
      if (line.indexOf('```') === 0) {
        inCodeBlock = !inCodeBlock;
      }
      if (inCodeBlock) {
        return;
      }
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
          onClick
        });
        return;
      }

      // Next test for '==='-style headers.
      match = line.match(/^([=]{2,}|[-]{2,})/);
      if (match && idx > 0) {
        const level = match[1][0] === '=' ? 1 : 2;
        const prev = lines[idx - 1];
        // If the previous line is already a '#'-style heading,
        // then this is not a '===' style heading.
        const prevMatch = prev.match(/^([#]{1,6}) (.*)/);
        if (prevMatch) {
          return;
        }
        // Take special care to parse markdown links into raw text.
        const text = prev.replace(/\[(.+)\]\(.+\)/g, '$1');
        let numbering = generateNumbering(numberingDict, level);
        headings.push({
          text,
          numbering,
          level,
          onClick
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
          onClick
        });
        return;
      }
    });
    return headings;
  }

  /**
   * Given a HTML DOM element, get the markdown headings
   * in that string.
   */
  export function getRenderedHTMLHeadingsForMarkdownDoc(
    node: HTMLElement,
    sanitizer: ISanitizer,
    numberingDict: { [level: number]: number },
    needsNumbering = true
  ): INumberedHeading[] {
    let headings: INumberedHeading[] = [];
    let headingNodes = node.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (let i = 0; i < headingNodes.length; i++) {
      const heading = headingNodes[i];
      const level = parseInt(heading.tagName[1], 10);
      let text = heading.textContent ? heading.textContent : '';
      let shallHide = !needsNumbering;

      // Show/hide numbering DOM element based on user settings
      if (heading.getElementsByClassName('numbering-entry').length > 0) {
        heading.removeChild(
          heading.getElementsByClassName('numbering-entry')[0]
        );
      }
      let html = sanitizer.sanitize(heading.innerHTML, sanitizerOptions);
      html = html.replace('¶', ''); // Remove the anchor symbol.
      const onClick = () => {
        heading.scrollIntoView();
      };

      // Get the numbering string
      let numbering = generateNumbering(numberingDict, level);

      // Generate the DOM element for numbering
      let numDOM = '';
      if (!shallHide) {
        numDOM = '<span class="numbering-entry">' + numbering + '</span>';
      }

      // Add DOM numbering element to document
      heading.innerHTML = numDOM + html;

      text = text.replace('¶', '');
      headings.push({
        level,
        text,
        numbering,
        html,
        onClick
      });
    }
    return headings;
  }
}
