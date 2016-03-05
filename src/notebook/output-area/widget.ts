// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  DisposableDelegate, IDisposable
} from 'phosphor-disposable';

import {
  IListChangedArgs, ListChangeType, ObservableList, IObservableList
} from 'phosphor-observablelist';

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
  ISignal, Signal
} from 'phosphor-signaling';

import {
  ResizeMessage, Widget
} from 'phosphor-widget';

import {
  Transformime,
  TextTransformer,
  ImageTransformer,
  HTMLTransformer
} from 'transformime';

import {
  consoleTextTransform,
  markdownTransform,
  LaTeXTransform,
  PDFTransform,
  SVGTransform,
  ScriptTransform
} from 'transformime-jupyter-transformers';

import {
  IOutput, IExecuteResult, IDisplayData, IStream, IError, MimeBundle
} from '../notebook/nbformat';

import {
  IOutputAreaModel
} from './model';


/**
 * The class name added to an output area widget.
 */
const OUTPUT_AREA_CLASS = 'jp-OutputArea';

/**
 * The class name added to an output area output.
 */
const OUTPUT_CLASS = 'jp-OutputArea-output';

/**
 * The class name added to an execute result.
 */
const EXECUTE_CLASS = 'jp-OutputArea-executeResult';

/**
 * The class name added to display data.
 */
const DISPLAY_CLASS = 'jp-OutputArea-displayData';

/**
 * The class name added to stdout data.
 */
const STDOUT_CLASS = 'jp-OutputArea-stdout';

/**
 * The class name added to stderr data.
 */
const STDERR_CLASS = 'jp-OutputArea-stderr';

/**
 * The class anme added to error data.
 */
const ERROR_CLASS = 'jp-Output-error';

/**
 * The class name added to fixed height output areas.
 */
const FIXED_HEIGHT_CLASS = 'jp-mod-fixedHeight';

/**
 The class name added to collaped output areas.
 */
const COLLAPSED_CLASS = 'jp-mod-collapsed';

/**
 * The class name added to output area prompts.
 */
const PROMPT_CLASS = 'jp-OutputArea-prompt';

/**
 * A list of transformers used to render outputs
 * 
 * #### Notes
 * The transformers are in ascending priority--later transforms are more
 * important than earlier ones.
 */
const transformers = [
  TextTransformer,
  PDFTransform,
  ImageTransformer,
  SVGTransform,
  consoleTextTransform,
  LaTeXTransform,
  markdownTransform,
  HTMLTransformer,
  ScriptTransform
];

/**
 * The global transformime transformer.
 */
const transform = new Transformime(transformers);


/**
 * An output area widget.
 */
export
class OutputAreaWidget extends Widget {
  /**
   * Construct an output area widget.
   */
  constructor(model: IOutputAreaModel) {
    super();
    this.addClass(OUTPUT_AREA_CLASS);
    this._model = model;
    this.layout = new PanelLayout();
    model.stateChanged.connect(this.modelStateChanged, this);
    let outputs = model.outputs;
    for (let i = 0; i < outputs.length; i++) {
      let widget = this.createOutput(outputs.get(i));
      (this.layout as PanelLayout).addChild(widget);
    }
    model.outputs.changed.connect(this.outputsChanged, this);
  }

  /**
   * Get the model used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get model(): IOutputAreaModel {
    return this._model;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose() {
    this._model.stateChanged.disconnect(this.modelStateChanged);
    this._model.outputs.changed.disconnect(this.outputsChanged);
    this._model = null;
    super.dispose();
  }

  /**
   * Create an output node from an output model.
   */
  protected createOutput(output: IOutput): Widget {
    let widget = new Widget();
    widget.addClass(OUTPUT_CLASS);
    let bundle: MimeBundle;
    switch(output.output_type) {
    case "execute_result":
      bundle = (output as IExecuteResult).data;
      widget.addClass(EXECUTE_CLASS);
      let prompt = document.createElement('div');
      prompt.className = PROMPT_CLASS;
      let count = (output as IExecuteResult).execution_count;
      prompt.textContent = `Out [${count === null ? ' ' : count}]:`;
      widget.node.appendChild(prompt);
      break;
    case "display_data":
      bundle = (output as IDisplayData).data;
      widget.addClass(DISPLAY_CLASS);
      break;
    case "stream":
      bundle = {'jupyter/console-text': (output as IStream).text};
      if ((output as IStream).name == 'stdout') {
        widget.addClass(STDOUT_CLASS);
      } else {
        widget.addClass(STDERR_CLASS);
      }
      break;
    case "error":
      let out: IError = output as IError;
      let traceback = out.traceback.join('\n');
      bundle = {'jupyter/console-text': traceback || `${out.ename}: ${out.evalue}`};
      widget.addClass(ERROR_CLASS);
      break;
    default:
      console.error(`Unrecognized output type: ${output.output_type}`);
      bundle = {};
    }
    transform.transform(bundle, document).then(result => {
      widget.node.appendChild(result.el);
    });
    return widget;
  }

  /**
   * Follow changes to the outputs list.
   */
  protected outputsChanged(sender: ObservableList<IOutput>, args: IListChangedArgs<IOutput>) {
    let layout = this.layout as PanelLayout;
    let widget: Widget;
    switch(args.type) {
    case ListChangeType.Add:
      let value = args.newValue as IOutput;
      layout.insertChild(args.newIndex, this.createOutput(value));
      break;
    case ListChangeType.Move:
      layout.insertChild(args.newIndex, layout.childAt(args.oldIndex));
      break;
    case ListChangeType.Remove:
      widget = layout.childAt(args.oldIndex);
      layout.removeChild(widget);
      widget.dispose();
      break;
    case ListChangeType.Replace:
      for (let i = layout.childCount(); i > 0; i--) {
        widget = layout.childAt(i - 1);
        layout.removeChild(widget);
        widget.dispose();
      }
      let newValue = args.newValue as IOutput[];
      for (let i = newValue.length; i > 0; i--) {
        layout.insertChild(args.newIndex, this.createOutput(newValue[i]));
      }
      break;
    case ListChangeType.Set:
      widget = layout.childAt(args.newIndex);
      layout.removeChild(widget);
      widget.dispose();
      widget = this.createOutput(args.newValue as IOutput);
      layout.insertChild(args.newIndex, widget);
      break;
    }
  }

  /**
   * Handle `update_request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    if (this.model.collapsed) {
      this.addClass(COLLAPSED_CLASS);
    } else {
      this.removeClass(COLLAPSED_CLASS);
    }
    if (this.model.fixedHeight) {
      this.addClass(FIXED_HEIGHT_CLASS);
    } else {
      this.removeClass(FIXED_HEIGHT_CLASS);
    }
  }

  /**
   * Change handler for model state changes.
   */
  protected modelStateChanged(sender: IOutputAreaModel,args: IChangedArgs<any>) {
    switch (args.name) {
    case 'collapsed':
      this.update();
      break;
    case 'fixedHeight':
      this.update();
      break;
    }
  }
  
  private _model: IOutputAreaModel;
}
