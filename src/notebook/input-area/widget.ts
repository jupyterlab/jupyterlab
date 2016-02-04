// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  Message
} from 'phosphor-messaging';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  ResizeMessage, Widget
} from 'phosphor-widget';

import {
  PanelLayout
} from 'phosphor-panel';

import {
  CodeMirrorWidget, IEditorModel
} from '../editor';

import {
  IInputAreaModel
} from './model';


/**
 * An input area widget, which hosts an editor widget.
 */
export
class InputAreaWidget extends Widget {

  /**
   * Construct an input area widget.
   */
  constructor(model: IInputAreaModel) {
    super();
    this.addClass('jp-InputAreaWidget');
    this._model = model;
    this.layout = new PanelLayout();
    this.updateTextEditor(model.textEditor);
    model.stateChanged.connect(this._modelUpdate, this);
  }

  /**
   * Update the text editor model, creating a new text editor
   * widget and detaching the old one.
   */
  updateTextEditor(editor: IEditorModel) {
    let layout = this.layout as PanelLayout;
    if (layout.childCount() > 0) {
      layout.childAt(0).dispose();
    }
    layout.addChild(new CodeMirrorWidget(editor));
  }

  /**
   * Change handler for model updates.
   */
  private _modelUpdate(sender: IInputAreaModel, args: IChangedArgs<any>) {
    switch(args.name) {
    case 'textEditor':
      this.updateTextEditor(args.newValue);
      break;
    case 'collapsed':
      break;
    case 'promptNumber':
      break;
    case 'executionCount':
      break;
    }
  }

  private _model: IInputAreaModel;
}
