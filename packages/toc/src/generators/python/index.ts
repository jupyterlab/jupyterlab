// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDocumentWidget } from '@jupyterlab/docregistry';
import { FileEditor, IEditorTracker } from '@jupyterlab/fileeditor';
import { TableOfContentsRegistry as Registry } from '../../registry';
import { IHeading } from '../../utils/headings';
import { render } from './render';

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

  // Iterate over the lines to get the heading level and text for each line:
  let headings: IHeading[] = [];
  let processingImports = false;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (line.indexOf('def ') === 0) {
      processingImports = false;
      headings.push({
        text: line.slice(0, -1),
        level: 2,
        onClick: onClick(i)
      });
    } else if (line.indexOf('class ') === 0) {
      processingImports = false;
      headings.push({
        text: line.slice(0, -1),
        level: 1,
        onClick: onClick(i)
      });
    } else if (line.indexOf('import ') == 0 && !processingImports) {
      processingImports = true;
      headings.push({
        text: line,
        level: 2,
        onClick: onClick(i)
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
 * Returns a boolean indicating whether this ToC generator is enabled.
 *
 * @private
 * @param editor - editor widget
 * @returns boolean indicating whether this ToC generator is enabled
 */
function isEnabled(editor: IDocumentWidget<FileEditor>) {
  let mime = editor.content.model.mimeType;
  return mime === 'application/x-python-code' || mime === 'text/x-python';
}

/**
 * Returns a ToC generator for Python files.
 *
 * @private
 * @param tracker - file editor tracker
 * @returns ToC generator capable of parsing Python files
 */
function createPythonGenerator(
  tracker: IEditorTracker
): Registry.IGenerator<IDocumentWidget<FileEditor>> {
  return {
    tracker,
    isEnabled: isEnabled,
    itemRenderer: render,
    generate: generate
  };
}

/**
 * Exports.
 */
export { createPythonGenerator };
