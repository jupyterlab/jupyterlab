// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import * as marked
  from 'marked';

import {
  Message
} from 'phosphor-messaging';

import {
  PanelLayout
} from 'phosphor-panel';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  Widget
} from 'phosphor-widget';

import {
  InputAreaWidget, IInputAreaModel
} from '../input-area';

import {
  OutputAreaWidget, IOutputAreaModel
} from '../output-area';

import {
  removeMath, replaceMath, typeset
} from '../utils/latex';

import {
  sanitize
} from 'sanitizer';

import {
  ICodeCellModel, IMarkdownCellModel, ICellModel, IRawCellModel
} from './model';


/**
 * The class name added to cell widgets.
 */
const CELL_CLASS = 'jp-Cell';

/**
 * The class name added to code cells.
 */
const CODE_CELL_CLASS = 'jp-CodeCell';

/**
 * The class name added to markdown cells.
 */
const MARKDOWN_CELL_CLASS = 'jp-MarkdownCell';

/**
 * The class name added to the markdown cell renderer widget.
 */
const RENDERER_CLASS = 'jp-MarkdownCell-renderer';

/**
 * The class name added to raw cells.
 */
const RAW_CELL_CLASS = 'jp-RawCell';

/**
 * The class name added to a rendered markdown cell.
 */
const RENDERED_CLASS = 'jp-mod-rendered';

/**
 * The text applied to an empty markdown cell.
 */
const DEFAULT_MARKDOWN_TEXT = 'Type Markdown and LaTeX: $ α^2 $';


/**
 * A base cell widget.
 */
export
class BaseCellWidget extends Widget {
  /**
   * Create a new input widget.
   */
  static createInput(model: IInputAreaModel): InputAreaWidget {
    return new InputAreaWidget(model);
  }

  /**
   * Construct a new base cell widget.
   */
  constructor(model: ICellModel) {
    super();
    this.addClass(CELL_CLASS);
    this._model = model;
    let constructor = this.constructor as typeof BaseCellWidget;
    this._input = constructor.createInput(model.input);
    this.layout = new PanelLayout();
    (this.layout as PanelLayout).addChild(this._input);
  }

  /**
   * Get the model used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get model(): ICellModel {
    return this._model;
  }

  /**
   * Get the input widget used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get input(): InputAreaWidget {
    return this._input;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose() {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    this._model.dispose();
    this._model = null;
    super.dispose();
  }

  private _input: InputAreaWidget = null;
  private _model: ICellModel = null;
}


/**
 * A widget for a code cell.
 */
export
class CodeCellWidget extends BaseCellWidget {

  /**
   * Create an output area widget.
   */
  static createOutput(model: IOutputAreaModel): OutputAreaWidget {
    return new OutputAreaWidget(model);
  }

  /**
   * Construct a code cell widget.
   */
  constructor(model: ICodeCellModel) {
    super(model);
    this.addClass(CODE_CELL_CLASS);
    let constructor = this.constructor as typeof CodeCellWidget;
    this._output = constructor.createOutput(model.output);
    (this.layout as PanelLayout).addChild(this._output);
  }

  /**
   * Get the output widget used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get output(): OutputAreaWidget {
    return this._output;
  }

  private _output: OutputAreaWidget = null;
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
class MarkdownCellWidget extends BaseCellWidget {
  /**
   * Construct a Markdown cell widget.
   */
  constructor(model: IMarkdownCellModel) {
    super(model);
    this.addClass(MARKDOWN_CELL_CLASS);
    // Insist on the Github-flavored markdown mode.
    model.input.textEditor.mimetype = 'text/x-ipythongfm';
    this._rendered = new Widget();
    this._rendered.addClass(RENDERER_CLASS);
    (this.layout as PanelLayout).addChild(this._rendered);
    this.model.stateChanged.connect(this.onModelChanged, this);
  }

  /**
   * Get the rendering widget used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get rendered(): Widget {
    return this._rendered;
  }

  /**
   * Handle `update_request` messages.
   */
  protected onUpdateRequest(message: Message): void {
    let model = this.model as IMarkdownCellModel;
    if (model.rendered) {
      if (this._dirty) {
        let text = model.input.textEditor.text || DEFAULT_MARKDOWN_TEXT;
        let data = removeMath(text);
        let html = marked(data['text']);
        // Always sanitize markdown output.
        html = sanitize(html);
        this.rendered.node.innerHTML = replaceMath(html, data['math']);
        typeset(this.rendered.node);
      }
      this._rendered.show();
      this.input.hide();
      this.addClass(RENDERED_CLASS);
    } else {
      this._rendered.hide();
      this.input.show();
      this.removeClass(RENDERED_CLASS);
    }
    this._dirty = false;
    super.onUpdateRequest(message);
  }

  /**
   * Change handler for model updates.
   */
  protected onModelChanged(sender: ICellModel, args: IChangedArgs<any>) {
    switch(args.name) {
    case 'rendered':
      this._dirty = true;
      this.update();
      break;
    }
  }

  private _rendered: Widget = null;
  private _dirty = true;
}


/**
 * A widget for a raw cell.
 */
export
class RawCellWidget extends BaseCellWidget {
  /**
   * Construct a raw cell widget.
   */
  constructor(model: IRawCellModel) {
    super(model);
    this.addClass(RAW_CELL_CLASS);
  }
}
