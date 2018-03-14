// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {FileEditor, IEditorTracker} from '@jupyterlab/fileeditor';

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
): TableOfContentsRegistry.IGenerator<NotebookPanel> {
  return {
    tracker,
    generate: panel => {
      let headings: IHeading[] = [];
      each(panel.notebook.widgets, cell => {
        let model = cell.model;
        // Only parse markdown cells
        if (model.type !== 'markdown') {
          return;
        }

        // Get the lines that start with a '#'
        const lines = model.value.text
          .split('\n')
          .filter(line => line[0] === '#');

        // Iterate over the lines to get the header level and
        // the text for the line.
        lines.forEach(line => {
          const level = line.search(/[^#]/);
          // Take special care to parse markdown links into raw text.
          const text = line.slice(level).replace(/\[(.+)\]\(.+\)/g, '$1');
          const onClick = () => {
            cell.node.scrollIntoView();
          };
          headings.push({text, level, onClick});
        });
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
      let headings: IHeading[] = [];
      let model = editor.model;

      // Split the text into lines, with the line number for each.
      // We will use the line number to scroll the editor upon
      // TOC item click.
      const lines = model.value.text
        .split('\n')
        .map((value, idx) => {
          return {value, idx};
        })
        .filter(line => line.value[0] === '#');

      // Iterate over the lines to get the header level and
      // the text for the line.
      lines.forEach(line => {
        const level = line.value.search(/[^#]/);
        // Take special care to parse markdown links into raw text.
        const text = line.value.slice(level).replace(/\[(.+)\]\(.+\)/g, '$1');
        const onClick = () => {
          editor.editor.setCursorPosition({line: line.idx, column: 0});
        };
        headings.push({text, level, onClick});
      });
      return headings;
    },
  };
}
