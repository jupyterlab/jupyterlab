// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IListChangedArgs, ListChangeType, ObservableList
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
  Widget
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
  sanitize
} from 'sanitizer';

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
 * The class name added to output area results.
 */
const RESULT_CLASS = 'jp-OutputArea-result';


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
 * A list of outputs considered safe.
 */
const safeOutputs = ['text/plain', 'text/latex', 'image/png', 'image/jpeg',
                     'jupyter/console-text'];

/**
 * A list of outputs that are sanitizable.
 */
const sanitizable = ['text/svg', 'text/html'];

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
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    this._model.dispose();
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
    this._sanitized = false;
    switch (output.output_type) {
    case 'execute_result':
      bundle = (output as IExecuteResult).data;
      widget.addClass(EXECUTE_CLASS);
      let prompt = document.createElement('div');
      prompt.className = PROMPT_CLASS;
      let count = (output as IExecuteResult).execution_count;
      prompt.textContent = `Out [${count === null ? ' ' : count}]:`;
      widget.node.appendChild(prompt);
      break;
    case 'display_data':
      bundle = (output as IDisplayData).data;
      widget.addClass(DISPLAY_CLASS);
      break;
    case 'stream':
      bundle = {'jupyter/console-text': (output as IStream).text};
      if ((output as IStream).name === 'stdout') {
        widget.addClass(STDOUT_CLASS);
      } else {
        widget.addClass(STDERR_CLASS);
      }
      break;
    case 'error':
      let out: IError = output as IError;
      let traceback = out.traceback.join('\n');
      bundle = {'jupyter/console-text': traceback || `${out.ename}: ${out.evalue}`};
      widget.addClass(ERROR_CLASS);
      break;
    default:
      console.error(`Unrecognized output type: ${output.output_type}`);
      bundle = {};
    }

    // Sanitize outputs as needed.
    if (!this.model.trusted) {
      let keys = Object.keys(bundle);
      for (let key of keys) {
        if (safeOutputs.indexOf(key) !== -1) {
          continue;
        } else if (sanitizable.indexOf(key) !== -1) {
          let out = bundle[key];
          if (typeof out === 'string') {
            bundle[key] = sanitize(out);
            this._sanitized = true;
          }
        } else {
          this._sanitized = true;
          // Don't display if we don't know how to sanitize it.
          console.log('Ignoring untrusted ' + key + ' output.');
          delete bundle[key];
          continue;
        }
      }
    }

    transform.transform(bundle, document).then(result => {
      widget.node.appendChild(result.el);
      result.el.classList.add(RESULT_CLASS);
    });
    return widget;
  }

  /**
   * Follow changes to the outputs list.
   */
  protected outputsChanged(sender: ObservableList<IOutput>, args: IListChangedArgs<IOutput>) {
    let layout = this.layout as PanelLayout;
    let widget: Widget;
    switch (args.type) {
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
      let oldValues = args.oldValue as IOutput[];
      for (let i = args.oldIndex; i < oldValues.length; i++) {
        widget = layout.childAt(args.oldIndex);
        layout.removeChild(widget);
        widget.dispose();
      }
      let newValues = args.newValue as IOutput[];
      for (let i = newValues.length; i < 0; i--) {
        layout.insertChild(args.newIndex, this.createOutput(newValues[i]));
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
  protected modelStateChanged(sender: IOutputAreaModel, args: IChangedArgs<any>) {
    switch (args.name) {
    case 'collapsed':
      this.update();
      break;
    case 'fixedHeight':
      this.update();
      break;
    case 'trusted':
      // Re-render only if necessary.
      if ((this._sanitized && args.newValue) || (!args.newValue)) {
        let layout = this.layout as PanelLayout;
        for (let i = 0; i < layout.childCount(); i++) {
          layout.removeChild(layout.childAt(0));
        }
        let outputs = this.model.outputs;
        for (let i = 0; i < outputs.length; i++) {
          layout.insertChild(0, this.createOutput(outputs.get(i)));
        }
      }
    }
  }

  private _sanitized = false;
  private _model: IOutputAreaModel = null;
}
