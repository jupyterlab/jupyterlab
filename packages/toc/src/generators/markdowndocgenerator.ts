// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDocumentWidget, MimeDocument } from '@jupyterlab/docregistry';

import { FileEditor, IEditorTracker } from '@jupyterlab/fileeditor';

import { TableOfContentsRegistry } from '../registry';

import { SharedMethods, INotebookHeading } from './shared';

import { IInstanceTracker, ISanitizer } from '@jupyterlab/apputils';

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
      return SharedMethods.isMarkdown(editor.content.model.mimeType);
    },
    generate: editor => {
      let model = editor.content.model;
      let onClickFactory = (line: number) => {
        return () => {
          editor.content.editor.setCursorPosition({ line, column: 0 });
        };
      };
      return Private.getMarkdownDocHeadings(
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
      return SharedMethods.isMarkdown(widget.content.mimeType);
    },
    generate: widget => {
      const onClickFactory = (el: Element) => {
        return () => {
          el.scrollIntoView();
        };
      };
      return SharedMethods.getRenderedHTMLHeadings(
        widget.content.node,
        onClickFactory,
        sanitizer,
        null,
        0
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
    numberingDict: any
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
        let numbering = SharedMethods.generateNumbering(numberingDict, level);
        // TODO: HEADER!!!
        headings.push({ text, numbering, level, onClick, type: 'header' });
        return;
      }

      // Next test for '==='-style headers.
      match = line.match(/^([=]{2,}|[-]{2,})/);
      if (match && idx > 0) {
        const level = match[1][0] === '=' ? 1 : 2;
        // Take special care to parse markdown links into raw text.
        const text = lines[idx - 1].replace(/\[(.+)\]\(.+\)/g, '$1');
        let numbering = SharedMethods.generateNumbering(numberingDict, level);
        // TODO: HEADER!!!
        headings.push({ text, numbering, level, onClick, type: 'header' });
        return;
      }

      // Finally test for HTML headers. This will not catch multiline
      // headers, nor will it catch multiple headers on the same line.
      // It should do a decent job of catching many, though.
      match = line.match(/<h([1-6])>(.*)<\/h\1>/i);
      if (match) {
        const level = parseInt(match[1], 10);
        const text = match[2];
        let numbering = SharedMethods.generateNumbering(numberingDict, level);
        // TODO: HEADER!!!
        headings.push({ text, numbering, level, onClick, type: 'header' });
        return;
      }
    });
    return headings;
  }
}
