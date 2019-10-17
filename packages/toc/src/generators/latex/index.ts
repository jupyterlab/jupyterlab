// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDocumentWidget } from '@jupyterlab/docregistry';

import { FileEditor, IEditorTracker } from '@jupyterlab/fileeditor';

import { TableOfContentsRegistry } from '../../registry';

import { IHeading } from '../../utils/headings';

/**
 * Maps LaTeX section headings to HTML header levels.
 *
 * ## Notes
 *
 * -   As `part` and `chapter` section headings appear to be less common, assign them to heading level 1.
 */
const LATEX_LEVELS: { [label: string]: number } = {
  part: 1, // Only available for report and book classes
  chapter: 1, // Only available for report and book classes
  section: 1,
  subsection: 2,
  subsubsection: 3,
  paragraph: 4,
  subparagraph: 5
};

/**
 * Returns a ToC generator for LaTeX files.
 *
 * @private
 * @param tracker - A file editor tracker
 * @returns ToC generator for parsing LaTeX files
 */
function createLatexGenerator(
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
          const level = LATEX_LEVELS[match[1]];
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
 * Exports.
 */
export { createLatexGenerator };
