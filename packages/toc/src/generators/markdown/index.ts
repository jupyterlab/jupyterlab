// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISanitizer } from '@jupyterlab/apputils';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { FileEditor, IEditorTracker } from '@jupyterlab/fileeditor';
import {
  IMarkdownViewerTracker,
  MarkdownDocument
} from '@jupyterlab/markdownviewer';
import { nullTranslator, ITranslator } from '@jupyterlab/translation';
import { TableOfContentsRegistry as Registry } from '../../registry';
import { TableOfContents } from '../../toc';
import { INumberedHeading } from '../../utils/headings';
import { isMarkdown } from '../../utils/is_markdown';
import { OptionsManager } from './options_manager';
import { render } from './render';
import { toolbar } from './toolbar_generator';
import { getHeadings } from './get_headings';
import { getRenderedHeadings } from './get_rendered_headings';

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
function generate(editor: IDocumentWidget<FileEditor>): INumberedHeading[] {
  let dict = {};
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
 * @param widget - table of contents widget
 * @param sanitizer - HTML sanitizer
 * @returns ToC generator capable of parsing Markdown files
 */
function createMarkdownGenerator(
  tracker: IEditorTracker,
  widget: TableOfContents,
  sanitizer: ISanitizer,
  translator?: ITranslator
): Registry.IGenerator<IDocumentWidget<FileEditor>> {
  const options = new OptionsManager(widget, {
    numbering: true,
    sanitizer,
    translator: translator || nullTranslator
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
   * @private
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
 * Returns a ToC generator for rendered Markdown files.
 *
 * @param tracker - Markdown viewer tracker
 * @param sanitizer - HTML sanitizer
 * @param widget - table of contents widget
 * @returns ToC generator capable of parsing rendered Markdown files
 */
function createRenderedMarkdownGenerator(
  tracker: IMarkdownViewerTracker,
  widget: TableOfContents,
  sanitizer: ISanitizer,
  translator?: ITranslator
): Registry.IGenerator<MarkdownDocument> {
  const options = new OptionsManager(widget, {
    numbering: true,
    sanitizer,
    translator: translator || nullTranslator
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
   * @private
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
  function generate(widget: MarkdownDocument): INumberedHeading[] {
    let dict = {};
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
