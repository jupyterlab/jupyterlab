// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel, KernelMessage
} from '@jupyterlab/services';

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  indexOf
} from 'phosphor/lib/algorithm/searching';

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  clearSignalData, defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  IListChangedArgs, IObservableList, ObservableList
} from '../../common/observablelist';

import {
  nbformat
} from '../notebook/nbformat';


/**
 * An model that maintains a list of output data.
 */
export
class OutputAreaModel implements IDisposable {
  /**
   * Construct a new observable outputs instance.
   */
  constructor() {
    this.list = new ObservableList<OutputAreaModel.Output>();
    this.list.changed.connect(this._onListChanged, this);
  }

  /**
   * A signal emitted when the model changes.
   */
  changed: ISignal<OutputAreaModel, IListChangedArgs<OutputAreaModel.Output>>;

  /**
   * A signal emitted when the model is disposed.
   */
  disposed: ISignal<OutputAreaModel, void>;

  /**
   * Get the length of the items in the model.
   *
   * #### Notes
   * This is a read-only property.
   */
  get length(): number {
    return this.list ? this.list.length : 0;
  }

  /**
   * Test whether the model is disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this.list === null;
  }

  /**
   * Dispose of the resources used by the model.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.disposed.emit(void 0);
    this.list.clear();
    this.list = null;
    clearSignalData(this);
  }

  /**
   * Get an item at the specified index.
   */
  get(index: number): OutputAreaModel.Output {
    return this.list.at(index);
  }

  /**
   * Add an output, which may be combined with previous output.
   *
   * #### Notes
   * The output bundle is copied.
   * Contiguous stream outputs of the same `name` are combined.
   */
  add(output: OutputAreaModel.Output): number {
    // If we received a delayed clear message, then clear now.
    if (this.clearNext) {
      this.clear();
      this.clearNext = false;
    }
    if (output.output_type === 'input_request') {
      this.list.add(output);
    }

    // Make a copy of the output bundle.
    let value = JSON.parse(JSON.stringify(output)) as nbformat.IOutput;

    // Join multiline text outputs.
    if (value.output_type === 'stream') {
      if (Array.isArray(value.text)) {
        value.text = (value.text as string[]).join('\n');
      }
    }

    // Consolidate outputs if they are stream outputs of the same kind.
    let index = this.length - 1;
    let lastOutput = this.get(index);
    if (value.output_type === 'stream'
        && lastOutput && lastOutput.output_type === 'stream'
        && value.name === lastOutput.name) {
      // In order to get a list change event, we add the previous
      // text to the current item and replace the previous item.
      // This also replaces the metadata of the last item.
      let text = value.text as string;
      value.text = lastOutput.text as string + text;
      this.list.set(index, value);
      return index;
    } else {
      switch (value.output_type) {
      case 'stream':
      case 'execute_result':
      case 'display_data':
      case 'error':
        return this.list.add(value);
      default:
        break;
      }
    }
    return -1;
  }

  /**
   * Clear all of the output.
   *
   * @param wait Delay clearing the output until the next message is added.
   */
  clear(wait: boolean = false): OutputAreaModel.Output[] {
    if (wait) {
      this.clearNext = true;
      return [];
    }
    return this.list.clear();
  }

  /**
   * Add a mime type to an output data bundle.
   *
   * @param output - The output to augment.
   *
   * @param mimetype - The mimetype to add.
   *
   * @param value - The value to add.
   *
   * #### Notes
   * The output must be contained in the model, or an error will be thrown.
   * Only non-existent types can be added.
   * Types are validated before being added.
   */
  addMimeData(output: nbformat.IDisplayData | nbformat.IExecuteResult, mimetype: string, value: string | JSONObject): void {
    let index = indexOf(this.list.items, output);
    if (index === -1) {
      throw new Error(`Cannot add data to non-tracked bundle`);
    }
    if (mimetype in output.data) {
      console.warn(`Cannot add existing key '${mimetype}' to bundle`);
      return;
    }
    if (nbformat.validateMimeValue(mimetype, value)) {
      output.data[mimetype] = value;
    } else {
      console.warn(`Refusing to add invalid mime value of type ${mimetype} to output`);
    }
  }

  /**
   * Execute code on a kernel and send outputs to the model.
   */
  execute(code: string, kernel: IKernel): Promise<KernelMessage.IExecuteReplyMsg> {
    // Override the default for `stop_on_error`.
    let content: KernelMessage.IExecuteRequest = {
      code,
      stop_on_error: true
    };
    this.clear();
    return new Promise<KernelMessage.IExecuteReplyMsg>((resolve, reject) => {
      let future = kernel.execute(content);
      // Handle published messages.
      future.onIOPub = (msg: KernelMessage.IIOPubMessage) => {
        let msgType = msg.header.msg_type;
        switch (msgType) {
        case 'execute_result':
        case 'display_data':
        case 'stream':
        case 'error':
          let model = msg.content as nbformat.IOutput;
          model.output_type = msgType as nbformat.OutputType;
          this.add(model);
          break;
        case 'clear_output':
          this.clear((msg as KernelMessage.IClearOutputMsg).content.wait);
          break;
        default:
          break;
        }
      };
      // Handle the execute reply.
      future.onReply = (msg: KernelMessage.IExecuteReplyMsg) => {
        resolve(msg);
        // API responses that contain a pager are special cased and their type
        // is overriden from 'execute_reply' to 'display_data' in order to
        // render output.
        let content = msg.content as KernelMessage.IExecuteOkReply;
        let payload = content && content.payload;
        if (!payload || !payload.length) {
          return;
        }
        let pages = payload.filter(i => (i as any).source === 'page');
        if (!pages.length) {
          return;
        }
        let page = JSON.parse(JSON.stringify(pages[0]));
        let model: nbformat.IOutput = {
          output_type: 'display_data',
          data: (page as any).data as nbformat.MimeBundle,
          metadata: {}
        };
        this.add(model);
      };
      // Handle stdin.
      future.onStdin = (msg: KernelMessage.IStdinMessage) => {
        if (KernelMessage.isInputRequestMsg(msg)) {
          this.add({
            output_type: 'input_request',
            prompt: msg.content.prompt,
            password: msg.content.password,
            kernel
          });
        }
      };
    });
  }

  protected clearNext = false;
  protected list: IObservableList<OutputAreaModel.Output> = null;

  /**
   * Handle a change to the list.
   */
  private _onListChanged(sender: IObservableList<OutputAreaModel.Output>, args: IListChangedArgs<OutputAreaModel.Output>) {
    this.changed.emit(args);
  }
}


/**
 * A namespace for OutputAreaModel statics.
 */
export
namespace OutputAreaModel {
  /**
   * Output for an input request from the kernel.
   */
  export
  interface IInputRequest {
    /**
     * Type of cell output.
     */
    output_type: 'input_request';

    /**
     * The text to show at the prompt.
     */
    prompt: string;

    /**
     * Whether the request is for a password.
     * If so, the frontend shouldn't echo input.
     */
    password: boolean;

    /**
     * The kernel that made the request, used to send an input response.
     */
    kernel: IKernel;
  }

  /**
   * A valid output area item.
   */
  export
  type Output = nbformat.IOutput | IInputRequest;
}


// Define the signals for the `OutputAreaModel` class.
defineSignal(OutputAreaModel.prototype, 'changed');
defineSignal(OutputAreaModel.prototype, 'disposed');
