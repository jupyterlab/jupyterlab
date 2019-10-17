// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISanitizer } from '@jupyterlab/apputils';

import { IDocumentWidget } from '@jupyterlab/docregistry';

import { FileEditor, IEditorTracker } from '@jupyterlab/fileeditor';

import {
  IMarkdownViewerTracker,
  MarkdownDocument
} from '@jupyterlab/markdownviewer';

import { TableOfContentsRegistry as Registry } from '../../registry';

import { TableOfContents } from '../../toc';

import { INumberingDictionary } from '../../utils/numbering_dictionary';

import { generateNumbering } from '../../utils/generate_numbering';

import { INumberedHeading } from '../../utils/headings';

import { isMarkdown } from '../../utils/is_markdown';

import { sanitizerOptions } from '../../utils/sanitizer_options';

import { OptionsManager } from './options_manager';

import { render } from './render';

import { toolbar } from './toolbar_generator';

import { getHeadings } from './get_headings';

function getRenderedHeadings(
  node: HTMLElement,
  sanitizer: ISanitizer,
  dict: INumberingDictionary,
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
      heading.removeChild(heading.getElementsByClassName('numbering-entry')[0]);
    }
    let html = sanitizer.sanitize(heading.innerHTML, sanitizerOptions);
    html = html.replace('¶', ''); // Remove the anchor symbol.
    const onClick = () => {
      heading.scrollIntoView();
    };

    // Get the numbering string
    let nstr = generateNumbering(dict, level);

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

/**
 * Returns a boolean indicating whether this ToC generator is enabled.
 *
 * @private
 * @param editor - editor widget
 * @returns boolean indicating whether this ToC generator is enabled
 */
function isEnabled(editor: IDocumentWidget<FileEditor>) {
  // Only enable this if the editor MIME type matches one of a few Markdown variants:
  return isMarkdown(editor.content.model.mimeType);
}

/**
 * Generates a table of contents.
 *
 * @private
 * @param editor - editor widget
 * @returns a list of headings
 */
function generate(
  editor: IDocumentWidget<FileEditor>
): Array<INumberedHeading> {
  let dict: INumberingDictionary = {};
  return getHeadings(editor.content.model.value.text, onClick, dict);

  /**
   * Returns a "click" handler.
   *
   * @private
   * @param line - line number
   * @returns click handler
   */
  function onClick(line: number) {
    return () => {
      editor.content.editor.setCursorPosition({
        line: line,
        column: 0
      });
    };
  }
}

/**
 * Returns a ToC generator for Markdown files.
 *
 * @private
 * @param tracker - file editor tracker
 * @returns A TOC generator that can parse markdown files.
 */
function createMarkdownGenerator(
  tracker: IEditorTracker,
  widget: TableOfContents,
  sanitizer: ISanitizer
): Registry.IGenerator<IDocumentWidget<FileEditor>> {
  // Create an options manager to manage user settings:
  const options = new OptionsManager(widget, {
    numbering: true,
    sanitizer
  });
  return {
    tracker,
    usesLatex: true,
    options: options,
    toolbarGenerator: generateToolbar,
    itemRenderer: renderItem,
    isEnabled: isEnabled,
    generate: generate
  };

  /**
   * Returns a toolbar generator.
   *
   * @returns toolbar generator
   */
  function generateToolbar() {
    return toolbar(options);
  }

  /**
   * Renders a table of contents item.
   *
   * @private
   * @param item - heading to render
   * @returns rendered item
   */
  function renderItem(item: INumberedHeading) {
    return render(options, item);
  }
}

/**
 * Create a TOC generator for rendered markdown files.
 *
 * @param tracker: A file editor tracker.
 *
 * @returns A TOC generator that can parse markdown files.
 */
function createRenderedMarkdownGenerator(
  tracker: IMarkdownViewerTracker,
  sanitizer: ISanitizer,
  widget: TableOfContents
): Registry.IGenerator<MarkdownDocument> {
  const options = new OptionsManager(widget, {
    numbering: true,
    sanitizer
  });
  return {
    tracker,
    usesLatex: true,
    options: options,
    toolbarGenerator: generateToolbar,
    itemRenderer: renderItem,
    generate: generate
  };

  /**
   * Returns a toolbar generator.
   *
   * @returns toolbar generator
   */
  function generateToolbar() {
    return toolbar(options);
  }

  /**
   * Renders a table of contents item.
   *
   * @private
   * @param item - heading to render
   * @returns rendered item
   */
  function renderItem(item: INumberedHeading) {
    return render(options, item);
  }

  /**
   * Generates a table of contents.
   *
   * @private
   * @param widget - Markdown document widget
   * @returns a list of headings
   */
  function generate(widget: MarkdownDocument): Array<INumberedHeading> {
    let dict: INumberingDictionary = {};
    return getRenderedHeadings(
      widget.content.node,
      sanitizer,
      dict,
      options.numbering
    );
  }
}

/**
 * Exports.
 */
export { createMarkdownGenerator };
export { createRenderedMarkdownGenerator };
