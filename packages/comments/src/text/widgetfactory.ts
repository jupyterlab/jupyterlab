// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CommentFileModel, CommentWidgetFactory } from '../api';
import { CodeEditorWrapper } from '@jupyterlab/codeeditor';
import { IThemeManager } from '@jupyterlab/apputils';
import { ITextSelectionComment } from './commentformat';
import { TextSelectionCommentWidget } from './widget';
import { docFromWrapper, markTextSelection } from './utils';
import { WidgetTracker } from '@jupyterlab/apputils';

export class TextSelectionCommentWidgetFactory extends CommentWidgetFactory<
  CodeEditorWrapper,
  ITextSelectionComment
> {
  constructor(
    options: TextSelectionCommentWidgetFactory.IOptions,
    theme: IThemeManager
  ) {
    super(options);
    this._theme = theme;
    this._tracker = options.tracker;
  }

  createWidget(
    comment: ITextSelectionComment,
    model: CommentFileModel,
    target?: CodeEditorWrapper
  ): TextSelectionCommentWidget | undefined {
    const wrapper = target ?? this._tracker.currentWidget;
    if (wrapper == null) {
      console.error('No CodeEditorWrapper found for comment', comment);
      return;
    }

    const mark = markTextSelection(
      docFromWrapper(wrapper),
      comment,
      this._theme
    );
    let theme = this._theme;
    return new TextSelectionCommentWidget({
      comment,
      model,
      mark,
      target: wrapper,
      theme
    });
  }

  readonly commentType = 'text-selection';

  readonly widgetType = 'text-selection';

  private _tracker: WidgetTracker<CodeEditorWrapper>;
  private _theme: IThemeManager;
}

export namespace TextSelectionCommentWidgetFactory {
  export interface IOptions extends CommentWidgetFactory.IOptions {
    tracker: WidgetTracker<CodeEditorWrapper>;
  }
}
