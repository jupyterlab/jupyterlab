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
  Panel, PanelLayout
} from 'phosphor-panel';

import {
    ICodeCellModel, IMarkdownCellModel, ICellModel
} from './model';

import {
    InputAreaWidget, IInputAreaModel
} from 'jupyter-js-input-area';

import {
    OutputAreaWidget, IOutputAreaModel
} from 'jupyter-js-output-area';

import * as marked from 'marked';

/**
 * A base cell widget.
 */
export
abstract class CellWidget extends Widget {
  constructor() {
    super();
    // we make the cell focusable by setting the tabIndex
    this.node.tabIndex = -1;
    this.layout = new PanelLayout();
  }
  
  protected _model: ICellModel;
  
}


/**
 * A widget for a code cell.
 */
export
class CodeCellWidget extends CellWidget {

  /**
   * Construct a code cell widget.
   */
  constructor(model: ICodeCellModel) {
    super();
    this.addClass('jp-Cell');
    this.addClass('jp-CodeCell');
    this._model = model;
    this.input = new InputAreaWidget(model.input);
    this.output = new OutputAreaWidget(model.output);
    (this.layout as PanelLayout).addChild(this.input);
    (this.layout as PanelLayout).addChild(this.output);
    model.stateChanged.connect(this.modelStateChanged, this);
  }

  /**
   * Update the input area, creating a new input area
   * widget and detaching the old one.
   */
  protected updateInputArea(input: IInputAreaModel) {
    this.input.dispose(); // removes from children
    this.input = new InputAreaWidget(input);
    (this.layout as PanelLayout).insertChild(0, this.input);
  }
  
  /**
   * Update the output area, creating a new output area
   * widget and detaching the old one.
   */
  protected updateOutputArea(output: IOutputAreaModel) {
    this.output.dispose();
    this.output = new OutputAreaWidget(output);
    (this.layout as PanelLayout).insertChild(1, this.output);
  }

  /**
   * Change handler for model updates.
   */
  protected modelStateChanged(sender: ICodeCellModel, args: IChangedArgs<any>) {
    switch(args.name) {
    case 'input':
      this.updateInputArea(args.newValue);
      break;
    case 'output':
      this.updateOutputArea(args.newValue);
      break;
    }
  }

  protected input: InputAreaWidget;
  protected output: OutputAreaWidget;
  protected _model: ICodeCellModel;
}


/**
 * A widget for a Markdown cell.
 * 
 * #### Notes
 * Things get complicated if we want the rendered text to update
 * any time the text changes, the text editor model changes, 
 * or the input area model changes.  We don't support automatically 
 * updating the rendered text in all of these cases.
 */
export
class MarkdownCellWidget extends CellWidget {

  /**
   * Construct a Markdown cell widget.
   */
  constructor(model: IMarkdownCellModel) {
    super();
    this.addClass('jp-Cell');
    this.addClass('jp-MarkdownCell');

    this._model = model;
    // Insist on the Github-flavored markdown mode
    model.input.textEditor.mimetype = 'text/x-gfm';
    this.input = new InputAreaWidget(model.input);
    this.rendered = new Widget();
    if (model.rendered) {
      this.renderInput();
    } else {
      this.editInput();
    }
    model.stateChanged.connect(this.modelStateChanged, this);
  }

  /**
   * Process the input and display the rendered Markdown.
   * 
   * #### Notes
   * This will remove the input widget.  
   * Call [[editInput]] to restore the editor.
   */
  renderInput() {
    this.rendered.node.innerHTML = marked(this._model.input.textEditor.text);
    this.input.parent = null;
    (this.layout as PanelLayout).addChild(this.rendered);
  }
  
  /**
   * Edit the Markdown source.
   * 
   * #### Notes
   * This will remove the rendered widget.  
   * Call [[renderInput]] to render the source.
   */
  editInput() {
    this.rendered.parent = null;
    (this.layout as PanelLayout).addChild(this.input);
  }

  /**
   * Update the input area, creating a new input area
   * widget and detaching the old one.
   */
  protected updateInputArea(input: IInputAreaModel) {
    this.input.dispose();
    this.input = new InputAreaWidget(input);
    if (this._model.rendered) {
      this.renderInput();
    } else {
      this.editInput();
    }
  }
  
  /**
   * Update the input area, creating a new input area
   * widget and detaching the old one.
   */
  protected updateRendered(rendered: boolean) {
    if (rendered) {
      this.renderInput();
    } else {
      this.editInput();
    }
  }

  /**
   * Change handler for model updates.
   */
  protected modelStateChanged(sender: IMarkdownCellModel, args: IChangedArgs<any>) {
    switch(args.name) {
    case 'input':
      this.updateInputArea(args.newValue);
      break;
    case 'rendered':
      this.updateRendered(args.newValue);
      break;
    }
  }

  protected input: InputAreaWidget;
  protected rendered: Widget;
  protected _model: IMarkdownCellModel;
}
