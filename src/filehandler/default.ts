// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import * as CodeMirror
  from 'codemirror';

import {
  IContentsModel, IContentsManager, IContentsOpts
} from 'jupyter-js-services';

import {
  CodeMirrorWidget
} from 'phosphor-codemirror';

import {
  Message
} from 'phosphor-messaging';

import {
  loadModeByFileName
} from '../codemirror';

import {
  showDialog
} from '../dialog';

import {
  AbstractFileHandler
} from './handler';

/**
 * The class name added to a jupyter code mirror widget.
 */
const EDITOR_CLASS = 'jp-CodeMirrorWidget';


/**
 * An implementation of a file handler.
 */
export
class FileHandler extends AbstractFileHandler<CodeMirrorWidget> {
  /**
   * Get the options used to save the widget content.
   */
  protected getSaveOptions(widget: CodeMirrorWidget, model: IContentsModel): Promise<IContentsOpts> {
    let name = model.path.split('/').pop();
    name = name.split('.')[0];
    let content = widget.editor.getDoc().getValue();
    return Promise.resolve({ path: model.path, content, name,
                             type: 'file', format: 'text' });
  }

  /**
   * Create the widget from an `IContentsModel`.
   */
  protected createWidget(model: IContentsModel): CodeMirrorWidget {
    let widget = new CodeMirrorWidget();
    widget.addClass(EDITOR_CLASS);
    CodeMirror.on(widget.editor.getDoc(), 'change', () => {
      this.setDirty(widget);
    });
    return widget;
  }

  /**
   * Populate a widget from an `IContentsModel`.
   */
  protected populateWidget(widget: CodeMirrorWidget, model: IContentsModel): Promise<IContentsModel> {
    widget.editor.getDoc().setValue(model.content);
    loadModeByFileName(widget.editor, model.name);
    return Promise.resolve(model);
  }
}
