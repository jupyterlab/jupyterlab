// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  RenderMime
} from 'jupyter-js-ui/lib/rendermime';

import {
  IListChangedArgs, ListChangeType, ObservableList
} from 'phosphor-observablelist';

import {
  Message
} from 'phosphor-messaging';

import {
  Panel, PanelLayout
} from 'phosphor-panel';

import {
  Widget
} from 'phosphor-widget';

import {
  sanitize
} from 'sanitizer';

import {
  nbformat
} from '../notebook/nbformat';

import {
  ObservableOutputs
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
 * The class name added to collaped output areas.
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
 * A list of outputs considered safe.
 */
const safeOutputs = ['text/plain', 'text/latex', 'image/png', 'image/jpeg',
                     'application/vnd.jupyter.console-text'];

/**
 * A list of outputs that are sanitizable.
 */
const sanitizable = ['text/svg', 'text/html'];


/**
 * An output area widget.
 */
export
class OutputAreaWidget extends Widget {
  /**
   * Construct an output area widget.
   */
  constructor(outputs: ObservableOutputs, rendermime: RenderMime<Widget>) {
    super();
    this.addClass(OUTPUT_AREA_CLASS);
    this._rendermime = rendermime;
    this.layout = new PanelLayout();
    for (let i = 0; i < outputs.length; i++) {
      let widget = this.createOutput(outputs.get(i));
      (this.layout as PanelLayout).addChild(widget);
    }
    outputs.changed.connect(this.outputsChanged, this);
    this._outputs = outputs;
  }

  /**
   * The trusted state of the widget.
   */
  get trusted(): boolean {
    return this._trusted;
  }
  set trusted(value: boolean) {
    if (this._trusted === value) {
      return;
    }
    this._trusted = value;
    // Re-render only if necessary.
    if ((this._sanitized && value) || (!value)) {
      let layout = this.layout as PanelLayout;
      for (let i = 0; i < layout.childCount(); i++) {
        layout.childAt(0).dispose();
      }
      let outputs = this._outputs;
      for (let i = 0; i < outputs.length; i++) {
        layout.addChild(this.createOutput(outputs.get(i)));
      }
    }
  }

  /**
   * The collapsed state of the widget.
   */
  get collapsed(): boolean {
    return this._collapsed;
  }
  set collapsed(value: boolean) {
    if (this._collapsed === value) {
      return;
    }
    this._collapsed = value;
    this.update();
  }

  /**
   * The fixed height state of the widget.
   */
  get fixedHeight(): boolean {
    return this._fixedHeight;
  }
  set fixedHeight(value: boolean) {
    if (this._fixedHeight === value) {
      return;
    }
    this._fixedHeight = value;
    this.update();
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose() {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    this._outputs = null;
    this._rendermime = null;
    super.dispose();
  }

  /**
   * Create an output node from an output model.
   */
  protected createOutput(output: nbformat.IOutput): Widget {
    let widget = new Panel();
    widget.addClass(OUTPUT_CLASS);
    let bundle: nbformat.MimeBundle;
    this._sanitized = false;
    switch (output.output_type) {
    case 'execute_result':
      bundle = (output as nbformat.IExecuteResult).data;
      widget.addClass(EXECUTE_CLASS);
      let prompt = new Widget();
      prompt.addClass(PROMPT_CLASS);
      let count = (output as nbformat.IExecuteResult).execution_count;
      prompt.node.textContent = `Out[${count === null ? ' ' : count}]:`;
      widget.addChild(prompt);
      break;
    case 'display_data':
      bundle = (output as nbformat.IDisplayData).data;
      widget.addClass(DISPLAY_CLASS);
      break;
    case 'stream':
      bundle = {'application/vnd.jupyter.console-text': (output as nbformat.IStream).text};
      if ((output as nbformat.IStream).name === 'stdout') {
        widget.addClass(STDOUT_CLASS);
      } else {
        widget.addClass(STDERR_CLASS);
      }
      break;
    case 'error':
      let out: nbformat.IError = output as nbformat.IError;
      let traceback = out.traceback.join('\n');
      bundle = {'application/vnd.jupyter.console-text': traceback || `${out.ename}: ${out.evalue}`};
      widget.addClass(ERROR_CLASS);
      break;
    default:
      console.error(`Unrecognized output type: ${output.output_type}`);
      bundle = {};
    }

    // Sanitize outputs as needed.
    if (!this.trusted) {
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

    if (bundle) {
      let child = this._rendermime.render(bundle);
      if (child) {
        child.addClass(RESULT_CLASS);
        widget.addChild(child);
      } else {
        console.log('Did not find renderer for output mimebundle.');
        console.log(bundle);
      }
    }
    return widget;
  }

  /**
   * Follow changes to the outputs list.
   */
  protected outputsChanged(sender: ObservableList<nbformat.IOutput>, args: IListChangedArgs<nbformat.IOutput>) {
    let layout = this.layout as PanelLayout;
    let widget: Widget;
    switch (args.type) {
    case ListChangeType.Add:
      let value = args.newValue as nbformat.IOutput;
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
      let oldValues = args.oldValue as nbformat.IOutput[];
      for (let i = args.oldIndex; i < oldValues.length; i++) {
        widget = layout.childAt(args.oldIndex);
        layout.removeChild(widget);
        widget.dispose();
      }
      let newValues = args.newValue as nbformat.IOutput[];
      for (let i = newValues.length; i < 0; i--) {
        layout.insertChild(args.newIndex, this.createOutput(newValues[i]));
      }
      break;
    case ListChangeType.Set:
      widget = layout.childAt(args.newIndex);
      layout.removeChild(widget);
      widget.dispose();
      widget = this.createOutput(args.newValue as nbformat.IOutput);
      layout.insertChild(args.newIndex, widget);
      break;
    default:
      break;
    }
  }

  /**
   * Handle `update_request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    if (this.collapsed) {
      this.addClass(COLLAPSED_CLASS);
    } else {
      this.removeClass(COLLAPSED_CLASS);
    }
    if (this.fixedHeight) {
      this.addClass(FIXED_HEIGHT_CLASS);
    } else {
      this.removeClass(FIXED_HEIGHT_CLASS);
    }
  }

  private _sanitized = false;
  private _trusted = false;
  private _fixedHeight = false;
  private _collapsed = false;
  private _outputs: ObservableOutputs = null;
  private _rendermime: RenderMime<Widget> = null;
}
