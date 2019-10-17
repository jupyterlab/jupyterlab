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

import { TableOfContents } from '../../toc';

import { INumberingDictionary } from '../../utils/numbering_dictionary';

import { generateNumbering } from '../../utils/generate_numbering';

import { INumberedHeading } from '../../utils/headings';

import { parseHeading } from '../../utils/parse_heading';

import { isMarkdown } from '../../utils/is_markdown';

import { sanitizerOptions } from '../../utils/sanitizer_options';

import { OptionsManager } from './options_manager';

import { render } from './render';

import { markdownDocGeneratorToolbar } from './toolbar';

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
  const options = new OptionsManager(widget, {
    numbering: true,
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
      return render(options, item);
    },
    isEnabled: editor => {
      // Only enable this if the editor mimetype matches
      // one of a few markdown variants.
      return isMarkdown(editor.content.model.mimeType);
    },
    generate: editor => {
      let numberingDict: INumberingDictionary = {};
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
  const options = new OptionsManager(widget, {
    numbering: true,
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
      return render(options, item);
    },
    generate: widget => {
      let numberingDict: INumberingDictionary = {};
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
    onClickFactory: (line: number) => () => void,
    numberingDict: INumberingDictionary
  ): INumberedHeading[] {
    // Split the text into lines.
    const lines = text.split('\n');
    let headings: INumberedHeading[] = [];

    let inCodeBlock = false;

    // Iterate over the lines to get the header level and
    // the text for the line.
    lines.forEach((line, idx) => {
      // Don't check for Markdown headings if we
      // are in a code block (demarcated by backticks).
      if (line.indexOf('```') === 0) {
        inCodeBlock = !inCodeBlock;
      }
      if (inCodeBlock) {
        return;
      }
      // Attempt to parse a heading:
      const heading = parseHeading(
        line + (lines[idx + 1] ? '\n' + lines[idx + 1] : '')
      ); // append the next line to capture alternative style Markdown headings
      if (heading) {
        headings.push({
          text: heading.text,
          numbering: generateNumbering(numberingDict, heading.level),
          level: heading.level,
          onClick: onClickFactory(idx)
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
    numberingDict: INumberingDictionary,
    numbering = true
  ): INumberedHeading[] {
    let headings: INumberedHeading[] = [];
    let headingNodes = node.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (let i = 0; i < headingNodes.length; i++) {
      const heading = headingNodes[i];
      const level = parseInt(heading.tagName[1], 10);
      let text = heading.textContent ? heading.textContent : '';
      let shallHide = !numbering;

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
      let nstr = generateNumbering(numberingDict, level);

      // Generate the DOM element for numbering
      let numDOM = '';
      if (!shallHide) {
        numDOM = '<span class="numbering-entry">' + nstr + '</span>';
      }

      // Add DOM numbering element to document
      heading.innerHTML = numDOM + html;

      text = text.replace('¶', '');
      headings.push({
        level,
        text,
        numbering: nstr,
        html,
        onClick
      });
    }
    return headings;
  }
}
