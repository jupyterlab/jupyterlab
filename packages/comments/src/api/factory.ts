// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IComment, IIdentity, IReply } from './commentformat';
import { UUID } from '@lumino/coreutils';
import { getCommentTimeStamp } from './utils';
import { CommentFileModel } from './model';
import { CommentWidget } from './widget';
import { ICommentRegistry } from './token';

export abstract class CommentWidgetFactory<T, C extends IComment = IComment> {
  constructor(options: CommentWidgetFactory.IOptions) {
    this.commentRegistry = options.commentRegistry;
  }

  abstract createWidget(
    comment: C,
    model: CommentFileModel,
    target?: T
  ): CommentWidget<T> | undefined;

  get commentFactory(): CommentFactory | undefined {
    return this.commentRegistry.getFactory(this.commentType);
  }

  readonly widgetType: string = '';
  readonly commentType: string = '';
  readonly commentRegistry: ICommentRegistry;
}

export namespace CommentWidgetFactory {
  export interface IOptions {
    commentRegistry: ICommentRegistry;
  }
}

export abstract class CommentFactory<C extends IComment = IComment> {
  createComment(options: CommentFactory.ICommentOptions<any>): C {
    const { identity, replies, id, text } = options;

    return {
      text,
      identity,
      type: this.type,
      time: getCommentTimeStamp(),
      editedTime: undefined,
      id: id ?? UUID.uuid4(),
      replies: replies ?? [],
      target: null
    } as C;
  }

  static createReply(options: CommentFactory.IReplyOptions): IReply {
    const { text, identity, id } = options;

    return {
      text,
      identity,
      id: id ?? UUID.uuid4(),
      time: getCommentTimeStamp(),
      editedTime: undefined,
      type: 'reply'
    };
  }

  readonly type: string = '';
}

export namespace CommentFactory {
  export interface IReplyOptions {
    text: string;
    identity: IIdentity;
    id?: string;
  }

  export interface ICommentOptions<T> extends IReplyOptions {
    source: T;
    replies?: IReply[];
  }
}
