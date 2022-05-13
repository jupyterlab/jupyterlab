// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Cell } from '@jupyterlab/cells';
import { IThemeManager } from '@jupyterlab/apputils';
import * as CodeMirror from 'codemirror';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { ICellSelectionComment } from './commentformat';
import { toCodeMirrorPosition, truncate } from '../api';

export function docFromCell(cell: Cell): CodeMirror.Doc {
  return (cell.editorWidget.editor as CodeMirrorEditor).doc;
}

export function markCommentSelection(
  doc: CodeMirror.Doc,
  comment: ICellSelectionComment,
  theme: IThemeManager
): CodeMirror.TextMarker {
  const color = comment.identity.color;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  const { start, end } = comment.target;
  const forward =
    start.line < end.line ||
    (start.line === end.line && start.column <= end.column);
  const anchor = toCodeMirrorPosition(forward ? start : end);
  const head = toCodeMirrorPosition(forward ? end : start);
  return doc.markText(anchor, head, {
    className: 'jp-comments-Highlight',
    title: `${comment.identity.name}: ${truncate(comment.text, 140)}`,
    css: `background-color: rgba( ${r}, ${g}, ${b}, ${
      theme.theme === 'JupyterLab Light' ? 0.15 : 0.3
    })`,
    attributes: { id: `CommentMark-${comment.id}` }
  });
}
