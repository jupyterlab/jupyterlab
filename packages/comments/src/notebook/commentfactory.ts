// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CommentFactory } from '../api';
import { ICellComment, ICellSelectionComment } from './commentformat';
import { Cell } from '@jupyterlab/cells';

export class CellCommentFactory extends CommentFactory<ICellComment> {
  createComment(options: CommentFactory.ICommentOptions<Cell>): ICellComment {
    const comment = super.createComment(options);
    comment.target = { cellID: options.source.model.id };

    return comment;
  }

  readonly type = 'cell';
}

export class CellSelectionCommentFactory extends CommentFactory<ICellSelectionComment> {
  createComment(
    options: CommentFactory.ICommentOptions<Cell>
  ): ICellSelectionComment {
    const comment = super.createComment(options);
    const { start, end } = options.source.editor.getSelection();

    comment.target = {
      cellID: options.source.model.id,
      start,
      end
    };

    return comment;
  }

  readonly type = 'cell-selection';
}
