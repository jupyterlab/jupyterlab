/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { CodeEditor, CodeEditorWrapper } from '@jupyterlab/codeeditor';
import { CodeMirrorEditor, ybinding } from '@jupyterlab/codemirror';
import { YFile } from '@jupyter/ydoc';

export function createEditorWidget(): CodeEditorWrapper {
  const sharedModel = new YFile();
  const model = new CodeEditor.Model({ sharedModel });
  const factory = (options: CodeEditor.IOptions) => {
    options.extensions = [
      ...(options.extensions ?? []),
      ybinding({
        ytext: sharedModel.ysource,
        undoManager: sharedModel.undoManager ?? undefined
      })
    ];
    return new CodeMirrorEditor(options);
  };
  return new CodeEditorWrapper({ factory, model });
}

/**
 * jsdom mock for getBoundingClientRect returns zeros for all fields,
 * see https://github.com/jsdom/jsdom/issues/653. We can do better,
 * and need to do better to get meaningful tests for rendering.
 */
export function getBoundingClientRectMock() {
  const style = window.getComputedStyle(this);
  const top = parseFloat(style.top) || 0;
  const left = parseFloat(style.left) || 0;
  const dimensions = {
    width: parseFloat(style.width) || parseFloat(style.minWidth) || 0,
    height: parseFloat(style.height) || parseFloat(style.minHeight) || 0,
    top,
    left,
    x: left,
    y: top,
    bottom: 0,
    right: 0
  };
  return {
    ...dimensions,
    toJSON: () => dimensions
  };
}
