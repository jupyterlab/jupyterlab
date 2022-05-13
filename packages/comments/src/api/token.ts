// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@lumino/coreutils';
import { CommentFactory, CommentWidgetFactory } from './factory';
import { Menu, Panel } from '@lumino/widgets';
import { ISignal } from '@lumino/signaling';
import { CommentFileWidget, CommentWidget } from './widget';
import { Awareness } from 'y-protocols/awareness';
import { CommentFileModel } from './model';
import { NewCommentButton } from './button';
import { IIdentity } from './commentformat';
import { DocumentRegistry } from '@jupyterlab/docregistry';

export interface ICommentRegistry {
  getFactory: (id: string) => CommentFactory | undefined;
  addFactory: (factory: CommentFactory) => void;

  readonly factories: Map<string, CommentFactory>;
}

export interface ICommentWidgetRegistry {
  getFactory: (id: string) => CommentWidgetFactory<any> | undefined;
  addFactory: (factory: CommentWidgetFactory<any>) => void;

  readonly factories: Map<string, CommentWidgetFactory<any>>;
}

export interface ICommentPanel extends Panel {
  /**
   * Scroll the comment with the given id into view.
   */
  scrollToComment: (id: string) => void;

  /**
   * A signal emitted when a comment is added to the panel.
   */
  commentAdded: ISignal<this, CommentWidget<any>>;

  /**
   * The dropdown menu for comment widgets.
   */
  commentMenu: Menu;

  /**
   * A signal emitted when the panel is about to be shown.
   */
  revealed: ISignal<this, undefined>;

  /**
   * The current awareness associated with the panel.
   */
  awareness: Awareness | undefined;

  /**
   * The current `CommentFileModel` associated with the panel.
   */
  model: CommentFileModel | undefined;

  button: NewCommentButton;

  fileWidget: CommentFileWidget | undefined;

  localIdentity: IIdentity;

  commentRegistry: ICommentRegistry;

  commentWidgetRegistry: ICommentWidgetRegistry;

  loadModel(
    context: DocumentRegistry.IContext<DocumentRegistry.IModel>
  ): Promise<void>;

  modelChanged: ISignal<this, CommentFileWidget | undefined>;

  mockComment(
    options: CommentFileWidget.IMockCommentOptions,
    index: number
  ): CommentWidget<any> | undefined;
}

export const ICommentRegistry = new Token<ICommentRegistry>(
  'jupyterlab:comment-registry'
);

export const ICommentWidgetRegistry = new Token<ICommentWidgetRegistry>(
  'jupyterlab:comment-widget-registry'
);

export const ICommentPanel = new Token<ICommentPanel>(
  'jupyterlab:comment-panel'
);
