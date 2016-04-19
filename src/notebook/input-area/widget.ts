// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  Widget
} from 'phosphor-widget';

import {
  PanelLayout
} from 'phosphor-panel';

import {
  CodeMirrorWidget, IEditorModel, IEditorWidget
} from '../editor';

import {
  IInputAreaModel
} from './model';


/**
 * The class name added to input area widgets.
 */
const INPUT_CLASS = 'jp-InputArea';

/**
 * The class name added to the prompt area of the input area.
 */
const PROMPT_CLASS = 'jp-InputArea-prompt';

/**
 * The class name added to the editor area of the input area.
 */
const EDITOR_CLASS = 'jp-InputArea-editor';

/**
 * The class name added to the input area when collapsed.
 */
const COLLAPSED_CLASS = 'jp-mod-collapsed';

/**
 * The class name added to to the input area when readonly.
 */
const READONLY_CLASS = 'jp-mod-readOnly';


/**
 * An input area widget, which hosts an editor widget.
 */
export
class InputAreaWidget extends Widget {
  /**
   * Create a new editor widget.
   */
  static createEditor(model: IEditorModel): IEditorWidget {
    return new CodeMirrorWidget(model);
  }

  /**
   * Construct an input area widget.
   */
  constructor(model: IInputAreaModel) {
    super();
    this.addClass(INPUT_CLASS);
    this._model = model;
    this.layout = new PanelLayout();
    this._prompt = new Widget();
    this._prompt.addClass(PROMPT_CLASS);
    let prompt = model.prompt;
    if (prompt !== null) {
      this.prompt.node.textContent = `In [${prompt || ' '}]:`;
    }
    let constructor = this.constructor as typeof InputAreaWidget;
    this._editor = constructor.createEditor(model.textEditor);
    this._editor.addClass(EDITOR_CLASS);
    let layout = this.layout as PanelLayout;
    layout.addChild(this._prompt);
    layout.addChild(this._editor);
    model.stateChanged.connect(this.onModelUpdated, this);
  }

  /**
   * Get the model used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get model(): IInputAreaModel {
    return this._model;
  }

  /**
   * Get the editor widget used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get editor(): IEditorWidget {
    return this._editor;
  }

  /**
   * Get the prompt widget for the input area.
   *
   * #### Notes
   * This is a read-only property.
   */
  get prompt(): Widget {
    return this._prompt;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose() {
    this._model.dispose();
    this._model = null;
    super.dispose();
  }

  /**
   * Change handler for model updates.
   */
  protected onModelUpdated(sender: IInputAreaModel, args: IChangedArgs<any>) {
    switch (args.name) {
    case 'collapsed':
      if (args.newValue) {
        this.addClass(COLLAPSED_CLASS);
      } else {
        this.removeClass(COLLAPSED_CLASS);
      }
      break;
    case 'readOnly':
      if (args.newValue) {
        this.addClass(READONLY_CLASS);
      } else {
        this.removeClass(READONLY_CLASS);
      }
      break;
    case 'prompt':
      if (args.newValue === null) {
        this.prompt.node.textContent = '';
      } else {
        this.prompt.node.textContent = `In [${args.newValue || ' '}]:`;
      }
      break;
    }
  }

  private _model: IInputAreaModel = null;
  private _editor: IEditorWidget = null;
  private _prompt: Widget = null;
}
