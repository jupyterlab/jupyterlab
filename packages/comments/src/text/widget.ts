// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditorWrapper } from '@jupyterlab/codeeditor';
import { IThemeManager } from '@jupyterlab/apputils';
import { ITextSelectionComment } from './commentformat';
import {
  CommentWidget,
  toCodeEditorPosition,
  toCodeMirrorPosition,
  truncate
} from '../api';
import * as CodeMirror from 'codemirror';
import { PartialJSONValue } from '@lumino/coreutils';
import { docFromWrapper, markTextSelection } from './utils';

export class TextSelectionCommentWidget extends CommentWidget<
  CodeEditorWrapper,
  ITextSelectionComment
> {
  constructor(options: TextSelectionCommentWidget.IOptions) {
    super(options);
    this._theme = options.theme;
    this._mark = options.mark;

    this._theme.themeChanged.connect(() => {
      this._mark = markTextSelection(
        docFromWrapper(options.target),
        options.comment,
        this._theme
      );
    });
  }

  dispose(): void {
    this._mark.clear();
    super.dispose();
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

    const textSelectionComment = json as ITextSelectionComment;
    const { from, to } = range as CodeMirror.MarkerRange;
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

  get element(): HTMLElement | undefined {
    return (
      document.getElementById(`CommentMark-${this.commentID}`) ?? undefined
    );
  }

  private get _doc(): CodeMirror.Doc {
    return docFromWrapper(this.target);
  }

  private _mark: CodeMirror.TextMarker;
  private _theme: IThemeManager;
}

export namespace TextSelectionCommentWidget {
  export interface IOptions
    extends CommentWidget.IOptions<CodeEditorWrapper, ITextSelectionComment> {
    mark: CodeMirror.TextMarker;
    theme: IThemeManager;
  }
}

namespace Private {
  export function getMockCommentPreviewText(
    doc: CodeMirror.Doc,
    comment: ITextSelectionComment
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
