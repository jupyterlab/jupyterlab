// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ITextSelectionComment } from './commentformat';
import { CommentFactory } from '../api';
import { CodeEditorWrapper } from '@jupyterlab/codeeditor';

export class TextSelectionCommentFactory extends CommentFactory<ITextSelectionComment> {
  createComment(
    options: CommentFactory.ICommentOptions<CodeEditorWrapper>
  ): ITextSelectionComment {
    const comment = super.createComment(options);
    const wrapper = options.source;

    let { start, end } = wrapper.editor.getSelection();

    if (
      start.line > end.line ||
      (start.line === end.line && start.column > end.column)
    ) {
      [start, end] = [end, start];
    }

    comment.target = { start, end };

    return comment;
  }

  readonly type = 'text-selection';
}
