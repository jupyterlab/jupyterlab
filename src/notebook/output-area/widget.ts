// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  RenderMime, MimeMap
} from '../../rendermime';

import {
  IListChangedArgs, ListChangeType
} from 'phosphor-observablelist';

import {
  Message
} from 'phosphor-messaging';

import {
  Panel, PanelLayout
} from 'phosphor-panel';

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  ChildMessage, Widget
} from 'phosphor-widget';

import {
  sanitize
} from 'sanitizer';

import {
  nbformat
} from '../notebook/nbformat';

import {
  OutputAreaModel
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
  constructor(options: OutputAreaWidget.IOptions) {
    super();
    this.addClass(OUTPUT_AREA_CLASS);
    this._rendermime = options.rendermime;
    this._renderer = options.renderer || OutputAreaWidget.defaultRenderer;
    this.layout = new PanelLayout();
  }

  /**
   * A signal emitted when the widget's model changes.
   */
  get modelChanged(): ISignal<OutputAreaWidget, void> {
     return Private.modelChangedSignal.bind(this);
  }

  /**
   * The model for the widget.
   */
  get model(): OutputAreaModel {
    return this._model;
  }
  set model(newValue: OutputAreaModel) {
    if (!newValue && !this._model || newValue === this._model) {
      return;
    }
    let oldValue = this._model;
    this._model = newValue;
    if (oldValue) {
      oldValue.changed.disconnect(this._onModelChange, this);
    }
    newValue.changed.connect(this._onModelChange, this);
    this.onModelChanged(oldValue, newValue);
    this.modelChanged.emit(void 0);
  }

  /**
   * Get the rendermime instance used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get rendermime(): RenderMime<Widget> {
    return this._rendermime;
  }

  /**
   * Get the renderer used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get renderer(): OutputAreaWidget.IRenderer {
    return this._renderer;
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
    this.onTrustChanged(value);
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
    this._model = null;
    this._rendermime = null;
    this._renderer = null;
    super.dispose();
  }

  /**
   * Get the child widget at the specified index.
   */
  childAt(index: number): Widget {
    let layout = this.layout as PanelLayout;
    return layout.childAt(index);
  }

  /**
   * Get the number of child widgets.
   */
  childCount(): number {
    let layout = this.layout as PanelLayout;
    return layout.childCount();
  }

  /**
   * Handle `update_request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
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

  /**
   * Handle `child-added` messages.
   */
  protected onChildAdded(msg: ChildMessage): void {
    msg.child.addClass(OUTPUT_CLASS);
  }

  /**
   * Handle `child-removed` messages.
   */
  protected onChildRemoved(msg: ChildMessage): void {
    msg.child.dispose();
  }

  /**
   * Handle a change to the model.
   *
   * The default implementation is to remove all of the old widgets
   * and add new widgets for the new outputs.
   */
  protected onModelChanged(oldValue: OutputAreaModel, newValue: OutputAreaModel): void {
    let layout = this.layout as PanelLayout;
    for (let i = 0; i < this.childCount(); i++) {
      let child = layout.childAt(i);
      child.parent = null;
    }
    if (!newValue) {
      return;
    }
    let renderer = this.renderer;
    let rendermime = this.rendermime;
    let trusted = this.trusted;
    for (let i = 0; i < newValue.length; i++) {
      let output = newValue.get(i);
      let widget = renderer.createOutput(output, rendermime, trusted);
      layout.addChild(widget);
    }
  }

  /**
   * Handle a change in trust.
   *
   * The default implementation is to call `onModelChanged`.
   */
  protected onTrustChanged(value: boolean): void {
    this.onModelChanged(this.model, this.model);
  }

  /**
   * Follow changes to the model.
   */
  private _onModelChange(sender: OutputAreaModel, args: IListChangedArgs<nbformat.IOutput>) {
    let layout = this.layout as PanelLayout;
    let value: nbformat.IOutput;
    let renderer = this.renderer;
    let rendermime = this.rendermime;
    let trusted = this.trusted;
    let widget: Widget;
    switch (args.type) {
    case ListChangeType.Add:
      value = args.newValue as nbformat.IOutput;
      widget = renderer.createOutput(value, rendermime, trusted);
      layout.addChild(widget);
      break;
    case ListChangeType.Replace:
      // Only "clear" is supported by the model.
      let oldValues = args.oldValue as nbformat.IOutput[];
      for (let i = args.oldIndex; i < oldValues.length; i++) {
        layout.childAt(args.oldIndex).parent = null;
      }
      break;
    case ListChangeType.Set:
      layout.childAt(args.oldIndex).parent = null;
      value = args.newValue as nbformat.IOutput;
      widget = renderer.createOutput(value, rendermime, trusted);
      layout.addChild(widget);
      break;
    default:
      break;
    }
    this.update();
  }

  private _trusted = false;
  private _fixedHeight = false;
  private _collapsed = false;
  private _model: OutputAreaModel = null;
  private _rendermime: RenderMime<Widget> = null;
  private _renderer: OutputAreaWidget.IRenderer = null;
}


/**
 * A namespace for OutputAreaWidget statics.
 */
export
namespace OutputAreaWidget {
  /**
   * The options to pass to an `OutputAreaWidget.
   */
  export
  interface IOptions {
    /**
     * The rendermime instance used by the widget.
     */
    rendermime: RenderMime<Widget>;

    /**
     * The output widget renderer.
     *
     * Defaults to a shared `IRenderer` instance.
     */
     renderer?: IRenderer;
  }

  /**
   * An output widget renderer.
   */
  export
  interface IRenderer {
    /**
     * Create an output widget.
     *
     * @param output - The kernel output message payload.
     *
     * @param rendermime - The rendermime instance.
     *
     * @param trusted - Whether the output is trusted.
     *
     * @returns A widget containing the rendered data.
     */
    createOutput(output: nbformat.IOutput, rendermime: RenderMime<Widget>, trusted?: boolean): Widget;
  }

  /**
   * The default implementation of `IRenderer`.
   */
  export
  class Renderer implements IRenderer {
    /**
     * Create an output widget.
     *
     * @param output - The kernel output message payload.
     *
     * @param rendermime - The rendermime instance.
     *
     * @param trusted - Whether the output is trusted.
     *
     * @returns A widget containing the rendered data.
     */
    createOutput(output: nbformat.IOutput, rendermime: RenderMime<Widget>, trusted = false): Widget {
      let bundle = this.getBundle(output);
      let data = this.convertBundle(bundle);
      if (!trusted) {
        this.sanitize(data);
      }
      let widget = new Panel();
      switch (output.output_type) {
      case 'execute_result':
        widget.addClass(EXECUTE_CLASS);
        let prompt = new Widget();
        prompt.addClass(PROMPT_CLASS);
        let count = (output as nbformat.IExecuteResult).execution_count;
        prompt.node.textContent = `Out[${count === null ? ' ' : count}]:`;
        widget.addChild(prompt);
        break;
      case 'display_data':
        widget.addClass(DISPLAY_CLASS);
        break;
      case 'stream':
        if ((output as nbformat.IStream).name === 'stdout') {
          widget.addClass(STDOUT_CLASS);
        } else {
          widget.addClass(STDERR_CLASS);
        }
        break;
      case 'error':
        widget.addClass(ERROR_CLASS);
        break;
      default:
        console.error(`Unrecognized output type: ${output.output_type}`);
        data = {};
      }

      if (data) {
        let child = rendermime.render(data);
        if (child) {
          child.addClass(RESULT_CLASS);
          widget.addChild(child);
        } else {
          console.log('Did not find renderer for output mimebundle.');
          console.log(data);
        }
      }
      return widget;
    }

    /**
     * Get the mime bundle for an output.
     *
     * @params output - A kernel output message payload.
     *
     * @returns - A mime bundle for the payload.
     */
    getBundle(output: nbformat.IOutput): nbformat.MimeBundle {
      let bundle: nbformat.MimeBundle;
      switch (output.output_type) {
      case 'execute_result':
        bundle = (output as nbformat.IExecuteResult).data;
        break;
      case 'display_data':
        bundle = (output as nbformat.IDisplayData).data;
        break;
      case 'stream':
        bundle = {'application/vnd.jupyter.console-text': (output as nbformat.IStream).text};
        break;
      case 'error':
        let out: nbformat.IError = output as nbformat.IError;
        let traceback = out.traceback.join('\n');
        bundle = {'application/vnd.jupyter.console-text': traceback || `${out.ename}: ${out.evalue}`};
        break;
      default:
        console.error(`Unrecognized output type: ${output.output_type}`);
        bundle = {};
      }
      return bundle;
    }

    /**
     * Convert a mime bundle to a mime map.
     */
    convertBundle(bundle: nbformat.MimeBundle): MimeMap<string> {
      let map: MimeMap<string> = Object.create(null);
      for (let mimeType in bundle) {
        let value = bundle[mimeType];
        if (Array.isArray(value)) {
          map[mimeType] = (value as string[]).join('\n');
        } else {
          map[mimeType] = value as string;
        }
      }
      return map;
    }

    /**
     * Sanitize a mime map.
     *
     * @params map - The map to sanitize.
     *
     * @returns Whether the
     */
    sanitize(map: MimeMap<string>): void {
      let keys = Object.keys(map);
      for (let key of keys) {
        if (safeOutputs.indexOf(key) !== -1) {
          continue;
        } else if (sanitizable.indexOf(key) !== -1) {
          let out = map[key];
          if (typeof out === 'string') {
            map[key] = sanitize(out);
          } else {
            console.log('Ignoring unsanitized ' + key + ' output; could not sanitize because output is not a string.');
            delete map[key];
          }
        } else {
          // Don't display if we don't know how to sanitize it.
          console.log('Ignoring untrusted ' + key + ' output.');
          delete map[key];
        }
      }
    }
  }

  /**
   * The default `Renderer` instance.
   */
  export
  const defaultRenderer = new Renderer();
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * A signal emitted when the widget's model changes.
   */
  export
  const modelChangedSignal = new Signal<OutputAreaWidget, void>();
}
