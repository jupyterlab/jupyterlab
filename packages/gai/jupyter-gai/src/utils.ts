/**
 * Contains various utility functions shared throughout the project.
 */
import { Notebook } from '@jupyterlab/notebook';
import { FileEditor } from '@jupyterlab/fileeditor';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { Widget } from '@lumino/widgets';

/**
 * Get text selection from the widget.
 */
export function getTextSelection(widget: Widget): string {
  const editor = getEditor(widget);
  if (!editor) {
    return '';
  }

  const selectionObj = editor.getSelection();
  const start = editor.getOffsetAt(selectionObj.start);
  const end = editor.getOffsetAt(selectionObj.end);
  const text = editor.model.sharedModel.getSource().substring(start, end);

  return text;
}

/**
 * Get editor instance from an editor widget (i.e. `DocumentWidget#content`).
 */
export function getEditor(widget: Widget): CodeEditor.IEditor | undefined {
  let editor: CodeEditor.IEditor | undefined;
  if (widget instanceof FileEditor) {
    editor = widget.editor;
  } else if (widget instanceof Notebook) {
    editor = widget.activeCell?.editor;
  }

  return editor;
}
