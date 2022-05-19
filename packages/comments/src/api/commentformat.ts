// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PartialJSONObject, PartialJSONValue } from '@lumino/coreutils';

/**
 * A type for the identity of a commenter.
 */
export interface IIdentity extends PartialJSONObject {
  id: number;
  name: string;
  color: string;
  icon: number;
}

export interface IBaseComment extends PartialJSONObject {
  id: string;
  type: string;
  identity: IIdentity;
  text: string;
  time: string;
  editedTime?: string;
}

export interface IReply extends IBaseComment {
  type: 'reply';
}

export interface ICommentWithReplies extends IBaseComment {
  replies: IReply[];
}

export interface IComment extends ICommentWithReplies {
  target: PartialJSONValue;
}
