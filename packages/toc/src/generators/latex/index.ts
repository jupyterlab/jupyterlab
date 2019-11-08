// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDocumentWidget } from '@jupyterlab/docregistry';
import { FileEditor, IEditorTracker } from '@jupyterlab/fileeditor';
import { TableOfContentsRegistry as Registry } from '../../registry';
import { IHeading } from '../../utils/headings';

/**
 * Maps LaTeX section headings to HTML header levels.
 *
 * ## Notes
 *
 * -   As `part` and `chapter` section headings appear to be less common, assign them to heading level 1.
 *
 * @private
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
 * Converts array elements to "entries".
 *
 * @private
 * @param arr - input array
 * @returns input array
 *
 * @example
 * const arr = toEntries([4,5,6]);
 * // returns [[4,0], [5,1], [6,2]]
 */
function toEntries(arr: Array<any>): Array<[any, number]> {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = [arr[i], i];
  }
  return arr;
}

/**
 * Returns a boolean indicating whether this ToC generator is enabled.
 *
 * @private
 * @param editor - editor widget
 * @returns boolean indicating whether this ToC generator is enabled
 */
function isEnabled(editor: IDocumentWidget<FileEditor>) {
  // Only enable this if the editor MIME type matches one of a few LaTeX variants:
  let mime = editor.content.model.mimeType;
  return mime === 'text/x-latex' || mime === 'text/x-stex';
}

/**
 * Generates a table of contents.
 *
 * @private
 * @param editor - editor widget
 * @returns a list of headings
 */
function generate(editor: IDocumentWidget<FileEditor>): IHeading[] {
  // Split the text into lines:
  let lines = editor.content.model.value.text.split('\n') as Array<any>;

  // Convert the list into "entries" so we can use the line number to scroll the editor upon ToC item click:
  lines = toEntries(lines);

  // Iterate over the lines to get the heading level and text for each line:
  let headings: IHeading[] = [];
  for (let i = 0; i < lines.length; i++) {
    const RE = /^\s*\\(section|subsection|subsubsection){(.+)}/;
    const match = lines[i][0].match(RE);
    if (match) {
      headings.push({
        text: match[2],
        level: LATEX_LEVELS[match[1]],
        onClick: onClick(lines[i][1])
      });
    }
  }
  return headings;

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
 * Returns a ToC generator for LaTeX files.
 *
 * @private
 * @param tracker - file editor tracker
 * @returns ToC generator capable of parsing LaTeX files
 */
function createLatexGenerator(
  tracker: IEditorTracker
): Registry.IGenerator<IDocumentWidget<FileEditor>> {
  return {
    tracker,
    usesLatex: true,
    isEnabled: isEnabled,
    generate: generate
  };
}

/**
 * Exports.
 */
export { createLatexGenerator };
