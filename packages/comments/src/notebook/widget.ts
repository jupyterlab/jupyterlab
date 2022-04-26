// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Cell } from '@jupyterlab/cells';
import { ICellComment, ICellSelectionComment } from './commentformat';
import * as CodeMirror from 'codemirror';
import { IThemeManager } from '@jupyterlab/apputils';
import { PartialJSONValue } from '@lumino/coreutils';
import {
  CommentWidget,
  toCodeEditorPosition,
  toCodeMirrorPosition,
  truncate
} from '../api';
import { docFromCell, markCommentSelection } from './utils';

export class CellCommentWidget extends CommentWidget<Cell, ICellComment> {
  constructor(options: CommentWidget.IOptions<Cell, ICellComment>) {
    super(options);
  }

  get element(): HTMLElement {
    return this.target.node;
  }
}

export class CellSelectionCommentWidget extends CommentWidget<
  Cell,
  ICellSelectionComment
> {
  constructor(options: CellSelectionCommentWidget.IOptions) {
    super(options);
    this._mark = options.mark;
    this._theme = options.theme;

    this._theme.themeChanged.connect(() => {
      this._mark = markCommentSelection(
        docFromCell(options.target),
        options.comment,
        this._theme
      );
    });
  }

  dispose(): void {
    this._mark.clear();
    super.dispose();
  }

  get element(): HTMLElement {
    return this.target.node;
  }

  toJSON(): PartialJSONValue {
    const json = super.toJSON();

    const mark = this._mark;
    if (mark == null) {
      console.warn(
        'No mark found--serializing based on initial text selection position',
        this
      );
      this.dispose();
      this.model.deleteComment(this.commentID);
      return json;
    }

    const range = mark.find();
    if (range == null) {
      console.warn(
        'Mark no longer exists in code editor--serializing based on initial text selection position',
        this
      );
      this.dispose();
      this.model.deleteComment(this.commentID);
      return json;
    }

    const { from, to } = range as CodeMirror.MarkerRange;
    const textSelectionComment = json as ICellSelectionComment;

    textSelectionComment.target.cellID = this.target.model.id;
    textSelectionComment.target.start = toCodeEditorPosition(from);
    textSelectionComment.target.end = toCodeEditorPosition(to);

    return textSelectionComment;
  }

  getPreview(): string | undefined {
    if (this.isMock || this._mark == null) {
      return Private.getMockCommentPreviewText(this._doc, this.comment!);
    }

    const range = this._mark.find();
    if (range == null) {
      return '';
    }

    const { from, to } = range as CodeMirror.MarkerRange;
    const text = this._doc.getRange(from, to);

    return truncate(text, 140);
  }

  private get _doc(): CodeMirror.Doc {
    return docFromCell(this.target);
  }

  private _mark: CodeMirror.TextMarker;
  private _theme: IThemeManager;
}

export namespace CellSelectionCommentWidget {
  export interface IOptions
    extends CommentWidget.IOptions<Cell, ICellSelectionComment> {
    mark: CodeMirror.TextMarker;
    theme: IThemeManager;
  }
}

namespace Private {
  export function getMockCommentPreviewText(
    doc: CodeMirror.Doc,
    comment: ICellSelectionComment
  ): string {
    const { start, end } = comment.target;
    const forward =
      start.line < end.line ||
      (start.line === end.line && start.column <= end.column);
    const from = toCodeMirrorPosition(forward ? start : end);
    const to = toCodeMirrorPosition(forward ? end : start);
    const text = doc.getRange(from, to);

    return truncate(text, 140);
  }
}
