// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IClientSession } from '@jupyterlab/apputils';

import { nbformat } from '@jupyterlab/coreutils';

import { DatastoreExt } from '@jupyterlab/datastore';

import {
  IOutputData,
  IRenderMimeRegistry,
  OutputModel
} from '@jupyterlab/rendermime';

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import { Kernel, KernelMessage } from '@jupyterlab/services';

import {
  JSONObject,
  PromiseDelegate,
  ReadonlyJSONObject
} from '@phosphor/coreutils';

import { Datastore, ListField } from '@phosphor/datastore';

import { Message } from '@phosphor/messaging';

import { Signal } from '@phosphor/signaling';

import { Panel, PanelLayout, Widget } from '@phosphor/widgets';

import { IOutputAreaData, OutputAreaData } from './data';

/**
 * The class name added to an output area widget.
 */
const OUTPUT_AREA_CLASS = 'jp-OutputArea';

/**
 * The class name added to the direction children of OutputArea
 */
const OUTPUT_AREA_ITEM_CLASS = 'jp-OutputArea-child';

/**
 * The class name added to actual outputs
 */
const OUTPUT_AREA_OUTPUT_CLASS = 'jp-OutputArea-output';

/**
 * The class name added to prompt children of OutputArea.
 */
const OUTPUT_AREA_PROMPT_CLASS = 'jp-OutputArea-prompt';

/**
 * The class name added to OutputPrompt.
 */
const OUTPUT_PROMPT_CLASS = 'jp-OutputPrompt';

/**
 * The class name added to an execution result.
 */
const EXECUTE_CLASS = 'jp-OutputArea-executeResult';

/**
 * The class name added stdin items of OutputArea
 */
const OUTPUT_AREA_STDIN_ITEM_CLASS = 'jp-OutputArea-stdin-item';

/**
 * The class name added to stdin widgets.
 */
const STDIN_CLASS = 'jp-Stdin';

/**
 * The class name added to stdin data prompt nodes.
 */
const STDIN_PROMPT_CLASS = 'jp-Stdin-prompt';

/**
 * The class name added to stdin data input nodes.
 */
const STDIN_INPUT_CLASS = 'jp-Stdin-input';

/******************************************************************************
 * OutputArea
 ******************************************************************************/

/**
 * An output area widget.
 */
export class OutputArea extends Widget {
  /**
   * Construct an output area widget.
   */
  constructor(options: OutputArea.IOptions) {
    super();
    let data = (this.data = options.data);
    this.addClass(OUTPUT_AREA_CLASS);
    this.rendermime = options.rendermime;
    this.contentFactory =
      options.contentFactory || OutputArea.defaultContentFactory;
    this.layout = new PanelLayout();
    const list = DatastoreExt.getField({ ...data.record, field: 'outputs' });
    for (let i = 0; i < list.length; i++) {
      this._insertOutput(i, { ...data.outputs, record: list[i] });
    }

    data.record.datastore.changed.connect(this.onChange, this);
  }

  /**
   * The data rendered by the widget.
   */
  readonly data: IOutputAreaData.DataLocation;

  /**
   * The content factory used by the widget.
   */
  readonly contentFactory: OutputArea.IContentFactory;

  /**
   * The rendermime instance used by the widget.
   */
  readonly rendermime: IRenderMimeRegistry;

  /**
   * A read-only sequence of the chidren widgets in the output area.
   */
  get widgets(): ReadonlyArray<Widget> {
    return (this.layout as PanelLayout).widgets;
  }

  /**
   * A public signal used to indicate the number of outputs has changed.
   *
   * #### Notes
   * This is useful for parents who want to apply styling based on the number
   * of outputs. Emits the current number of outputs.
   */
  readonly outputLengthChanged = new Signal<this, number>(this);

  /**
   * The kernel future associated with the output area.
   */
  get future(): Kernel.IShellFuture<
    KernelMessage.IExecuteRequestMsg,
    KernelMessage.IExecuteReplyMsg
  > | null {
    return this._future;
  }

  set future(
    value: Kernel.IShellFuture<
      KernelMessage.IExecuteRequestMsg,
      KernelMessage.IExecuteReplyMsg
    > | null
  ) {
    if (this._future === value) {
      return;
    }
    if (this._future) {
      this._future.dispose();
    }
    this._future = value;

    OutputAreaData.clear(this.data);

    // Make sure there were no input widgets.
    if (this.widgets.length) {
      this._clear();
      this.outputLengthChanged.emit(0);
    }

    // Handle published messages.
    value.onIOPub = this._onIOPub;

    // Handle the execute reply.
    value.onReply = this._onExecuteReply;

    // Handle stdin.
    value.onStdin = msg => {
      if (KernelMessage.isInputRequestMsg(msg)) {
        this.onInputRequest(msg, value);
      }
    };
  }

  /**
   * Dispose of the resources used by the output area.
   */
  dispose(): void {
    if (this._future) {
      this._future.dispose();
    }
    this._future = null;
    this._displayIdMap.clear();
    Signal.clearData(this);
    super.dispose();
  }
  /**
   * Follow changes to the datastore.
   */
  protected onChange(sender: Datastore, args: Datastore.IChangedArgs) {
    // Keep track of the items that have been rendered.
    const handled = new Set<string>();

    // First, handle list removals and inserts.
    const { schema, record } = this.data.record;
    const listChange =
      args.change[schema.id] &&
      args.change[schema.id][record] &&
      (args.change[schema.id][record]['outputs'] as ListField.Change<string>);
    if (listChange) {
      listChange.forEach(change => {
        // Remove any disposed values
        for (let i = 0; i < change.removed.length; i++) {
          this.widgets[change.index].dispose();
        }
        // Insert new values
        for (let i = 0; i < change.inserted.length; i++) {
          const id = change.inserted[i];
          const record = {
            ...this.data.outputs,
            record: id
          };
          this._insertOutput(change.index + i, record);
          // Mark this item as having been rendered.
          handled.add(id);
        }
      });
    }
    // Check for changes to individual outputs.
    const outputChanges = args.change[this.data.outputs.schema.id];
    if (!outputChanges) {
      return;
    }
    const outputs = DatastoreExt.getField({
      ...this.data.record,
      field: 'outputs'
    });
    Object.keys(outputChanges).forEach(output => {
      const index = outputs.indexOf(output);
      // If this output belongs to us, and we have not rerendered it already,
      // then rerender it in-place. This can happen when an output is updated
      // or a stream is consolidated.
      if (index !== -1 && !handled.has(output)) {
        const record = {
          ...this.data.outputs,
          record: output
        };
        this._setOutput(index, record);
      }
    });
  }

  /**
   * Clear the widget inputs and outputs.
   */
  private _clear(): void {
    // Bail if there is no work to do.
    if (!this.widgets.length) {
      return;
    }

    // Remove all of our widgets.
    let length = this.widgets.length;
    for (let i = 0; i < length; i++) {
      let widget = this.widgets[0];
      widget.parent = null;
      widget.dispose();
    }

    // Clear the display id map.
    this._displayIdMap.clear();

    // When an output area is cleared and then quickly replaced with new
    // content (as happens with @interact in widgets, for example), the
    // quickly changing height can make the page jitter.
    // We introduce a small delay in the minimum height
    // to prevent this jitter.
    let rect = this.node.getBoundingClientRect();
    this.node.style.minHeight = `${rect.height}px`;
    if (this._minHeightTimeout) {
      clearTimeout(this._minHeightTimeout);
    }
    this._minHeightTimeout = window.setTimeout(() => {
      if (this.isDisposed) {
        return;
      }
      this.node.style.minHeight = '';
    }, 50);
  }

  /**
   * Handle an input request from a kernel.
   */
  protected onInputRequest(
    msg: KernelMessage.IInputRequestMsg,
    future: Kernel.IShellFuture
  ): void {
    // Add an output widget to the end.
    let factory = this.contentFactory;
    let stdinPrompt = msg.content.prompt;
    let password = msg.content.password;

    let panel = new Panel();
    panel.addClass(OUTPUT_AREA_ITEM_CLASS);
    panel.addClass(OUTPUT_AREA_STDIN_ITEM_CLASS);

    let prompt = factory.createOutputPrompt();
    prompt.addClass(OUTPUT_AREA_PROMPT_CLASS);
    panel.addWidget(prompt);

    let input = factory.createStdin({ prompt: stdinPrompt, password, future });
    input.addClass(OUTPUT_AREA_OUTPUT_CLASS);
    panel.addWidget(input);

    let layout = this.layout as PanelLayout;
    layout.addWidget(panel);

    /**
     * Wait for the stdin to complete, add it to the model (so it persists)
     * and remove the stdin widget.
     */
    void input.value.then(value => {
      // Use stdin as the stream so it does not get combined with stdout.
      OutputAreaData.appendItem(this.data, {
        output_type: 'stream',
        name: 'stdin',
        text: value + '\n'
      });
      panel.dispose();
    });
  }

  /**
   * Update an output in the layout in place.
   */
  private _setOutput(
    index: number,
    loc: DatastoreExt.RecordLocation<IOutputData.ISchema>
  ): void {
    let layout = this.layout as PanelLayout;
    let panel = layout.widgets[index] as Panel;
    let renderer = (panel.widgets
      ? panel.widgets[1]
      : panel) as IRenderMime.IRenderer;
    if (renderer.renderModel) {
      // Create a temporary output model view to pass of to the renderer.
      let model = new OutputModel({ record: loc });
      void renderer.renderModel(model);
    } else {
      layout.widgets[index].dispose();
      this._insertOutput(index, loc);
    }
  }

  /**
   * Render and insert a single output into the layout.
   */
  private _insertOutput(
    index: number,
    loc: DatastoreExt.RecordLocation<IOutputData.ISchema>
  ): void {
    let output = this.createOutputItem(loc);
    let executionCount = DatastoreExt.getField({
      ...loc,
      field: 'executionCount'
    });
    if (output) {
      output.toggleClass(EXECUTE_CLASS, executionCount !== null);
    } else {
      output = new Widget();
    }
    let layout = this.layout as PanelLayout;
    layout.insertWidget(index, output);
  }

  /**
   * Create an output item with a prompt and actual output
   */
  protected createOutputItem(
    loc: DatastoreExt.RecordLocation<IOutputData.ISchema>
  ): Widget | null {
    let output = this.createRenderedMimetype(loc);

    if (!output) {
      return null;
    }

    let executionCount = DatastoreExt.getField({
      ...loc,
      field: 'executionCount'
    });

    let panel = new Panel();

    panel.addClass(OUTPUT_AREA_ITEM_CLASS);

    let prompt = this.contentFactory.createOutputPrompt();
    prompt.executionCount = executionCount;
    prompt.addClass(OUTPUT_AREA_PROMPT_CLASS);
    panel.addWidget(prompt);

    output.addClass(OUTPUT_AREA_OUTPUT_CLASS);
    panel.addWidget(output);
    return panel;
  }

  /**
   * Render a mimetype
   */
  protected createRenderedMimetype(
    loc: DatastoreExt.RecordLocation<IOutputData.ISchema>
  ): Widget | null {
    // Create a temporary output model view to pass of to the renderer.
    let model = new OutputModel({ record: loc });
    let mimeType = this.rendermime.preferredMimeType(
      model.data,
      model.trusted ? 'any' : 'ensure'
    );

    if (!mimeType) {
      return null;
    }
    let metadata = model.metadata;
    let mimeMd = metadata[mimeType] as ReadonlyJSONObject;
    let isolated = false;
    // mime-specific higher priority
    if (mimeMd && mimeMd['isolated'] !== undefined) {
      isolated = mimeMd['isolated'] as boolean;
    } else {
      // fallback on global
      isolated = metadata['isolated'] as boolean;
    }

    let output = this.rendermime.createRenderer(mimeType);
    if (isolated === true) {
      output = new Private.IsolatedRenderer(output);
    }
    output.renderModel(model).catch(error => {
      // Manually append error message to output
      const pre = document.createElement('pre');
      pre.textContent = `Javascript Error: ${error.message}`;
      output.node.appendChild(pre);

      // Remove mime-type-specific CSS classes
      output.node.className = 'p-Widget jp-RenderedText';
      output.node.setAttribute(
        'data-mime-type',
        'application/vnd.jupyter.stderr'
      );
    });
    return output;
  }

  /**
   * Handle an iopub message.
   */
  private _onIOPub = (msg: KernelMessage.IIOPubMessage) => {
    let msgType = msg.header.msg_type;
    let output: nbformat.IOutput;
    let transient = ((msg.content as any).transient || {}) as JSONObject;
    let displayId = transient['display_id'] as string;
    let targets: number[];

    switch (msgType) {
      case 'execute_result':
      case 'display_data':
      case 'stream':
      case 'error':
        output = msg.content as nbformat.IOutput;
        output.output_type = msgType as nbformat.OutputType;
        OutputAreaData.appendItem(this.data, output);
        break;
      case 'clear_output':
        // TODO: handle clearNext in the widget now that it is no
        // longer in the model.
        // let wait = (msg as KernelMessage.IClearOutputMsg).content.wait;
        OutputAreaData.clear(this.data);
        break;
      case 'update_display_data':
        output = msg.content as nbformat.IOutput;
        output.output_type = 'display_data';
        targets = this._displayIdMap.get(displayId);
        if (targets) {
          for (let index of targets) {
            OutputAreaData.setItem(this.data, index, output);
          }
        }
        break;
      default:
        break;
    }
    if (displayId && msgType === 'display_data') {
      let list = DatastoreExt.getField({
        ...this.data.record,
        field: 'outputs'
      });
      targets = this._displayIdMap.get(displayId) || [];
      targets.push(list.length - 1);
      this._displayIdMap.set(displayId, targets);
    }
  };

  /**
   * Handle an execute reply message.
   */
  private _onExecuteReply = (msg: KernelMessage.IExecuteReplyMsg) => {
    // API responses that contain a pager are special cased and their type
    // is overridden from 'execute_reply' to 'display_data' in order to
    // render output.
    let content = msg.content;
    if (content.status !== 'ok') {
      return;
    }
    let payload = content && content.payload;
    if (!payload || !payload.length) {
      return;
    }
    let pages = payload.filter((i: any) => (i as any).source === 'page');
    if (!pages.length) {
      return;
    }
    let page = JSON.parse(JSON.stringify(pages[0]));
    let output: nbformat.IOutput = {
      output_type: 'display_data',
      data: (page as any).data as nbformat.IMimeBundle,
      metadata: {}
    };
    OutputAreaData.appendItem(this.data, output);
  };

  private _minHeightTimeout: number = null;
  private _future: Kernel.IShellFuture<
    KernelMessage.IExecuteRequestMsg,
    KernelMessage.IExecuteReplyMsg
  > | null = null;
  private _displayIdMap = new Map<string, number[]>();
}

export class SimplifiedOutputArea extends OutputArea {
  /**
   * Handle an input request from a kernel by doing nothing.
   */
  protected onInputRequest(
    msg: KernelMessage.IInputRequestMsg,
    future: Kernel.IShellFuture
  ): void {
    return;
  }

  /**
   * Create an output item without a prompt, just the output widgets
   */
  protected createOutputItem(
    loc: DatastoreExt.RecordLocation<IOutputData.ISchema>
  ): Widget | null {
    let output = this.createRenderedMimetype(loc);
    if (output) {
      output.addClass(OUTPUT_AREA_OUTPUT_CLASS);
    }
    return output;
  }
}

/**
 * A namespace for OutputArea statics.
 */
export namespace OutputArea {
  /**
   * The options to create an `OutputArea`.
   */
  export interface IOptions {
    /**
     * The model used by the widget.
     */
    data: IOutputAreaData.DataLocation;

    /**
     * The content factory used by the widget to create children.
     */
    contentFactory?: IContentFactory;

    /**
     * The rendermime instance used by the widget.
     */
    rendermime: IRenderMimeRegistry;
  }

  /**
   * Execute code on an output area.
   */
  export async function execute(
    code: string,
    output: OutputArea,
    session: IClientSession,
    metadata?: JSONObject
  ): Promise<KernelMessage.IExecuteReplyMsg> {
    // Override the default for `stop_on_error`.
    let stopOnError = true;
    if (
      metadata &&
      Array.isArray(metadata.tags) &&
      metadata.tags.indexOf('raises-exception') !== -1
    ) {
      stopOnError = false;
    }
    let content: KernelMessage.IExecuteRequestMsg['content'] = {
      code,
      stop_on_error: stopOnError
    };

    if (!session.kernel) {
      throw new Error('Session has no kernel.');
    }
    let future = session.kernel.requestExecute(content, false, metadata);
    output.future = future;
    return future.done;
  }

  /**
   * An output area widget content factory.
   *
   * The content factory is used to create children in a way
   * that can be customized.
   */
  export interface IContentFactory {
    /**
     * Create an output prompt.
     */
    createOutputPrompt(): IOutputPrompt;

    /**
     * Create an stdin widget.
     */
    createStdin(options: Stdin.IOptions): IStdin;
  }

  /**
   * The default implementation of `IContentFactory`.
   */
  export class ContentFactory implements IContentFactory {
    /**
     * Create the output prompt for the widget.
     */
    createOutputPrompt(): IOutputPrompt {
      return new OutputPrompt();
    }

    /**
     * Create an stdin widget.
     */
    createStdin(options: Stdin.IOptions): IStdin {
      return new Stdin(options);
    }
  }

  /**
   * The default `ContentFactory` instance.
   */
  export const defaultContentFactory = new ContentFactory();
}

/******************************************************************************
 * OutputPrompt
 ******************************************************************************/

/**
 * The interface for an output prompt.
 */
export interface IOutputPrompt extends Widget {
  /**
   * The execution count for the prompt.
   */
  executionCount: nbformat.ExecutionCount;
}

/**
 * The default output prompt implementation
 */
export class OutputPrompt extends Widget implements IOutputPrompt {
  /*
   * Create an output prompt widget.
   */
  constructor() {
    super();
    this.addClass(OUTPUT_PROMPT_CLASS);
  }

  /**
   * The execution count for the prompt.
   */
  get executionCount(): nbformat.ExecutionCount {
    return this._executionCount;
  }
  set executionCount(value: nbformat.ExecutionCount) {
    this._executionCount = value;
    if (value === null) {
      this.node.textContent = '';
    } else {
      this.node.textContent = `[${value}]:`;
    }
  }

  private _executionCount: nbformat.ExecutionCount = null;
}

/******************************************************************************
 * Stdin
 ******************************************************************************/

/**
 * The stdin interface
 */
export interface IStdin extends Widget {
  /**
   * The stdin value.
   */
  readonly value: Promise<string>;
}

/**
 * The default stdin widget.
 */
export class Stdin extends Widget implements IStdin {
  /**
   * Construct a new input widget.
   */
  constructor(options: Stdin.IOptions) {
    super({
      node: Private.createInputWidgetNode(options.prompt, options.password)
    });
    this.addClass(STDIN_CLASS);
    this._input = this.node.getElementsByTagName('input')[0];
    this._input.focus();
    this._future = options.future;
    this._value = options.prompt + ' ';
  }

  /**
   * The value of the widget.
   */
  get value() {
    return this._promise.promise.then(() => this._value);
  }

  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the dock panel's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    let input = this._input;
    if (event.type === 'keydown') {
      if ((event as KeyboardEvent).keyCode === 13) {
        // Enter
        this._future.sendInputReply({
          status: 'ok',
          value: input.value
        });
        if (input.type === 'password') {
          this._value += Array(input.value.length + 1).join('·');
        } else {
          this._value += input.value;
        }
        this._promise.resolve(void 0);
      }
    }
  }

  /**
   * Handle `after-attach` messages sent to the widget.
   */
  protected onAfterAttach(msg: Message): void {
    this._input.addEventListener('keydown', this);
    this.update();
  }

  /**
   * Handle `update-request` messages sent to the widget.
   */
  protected onUpdateRequest(msg: Message): void {
    this._input.focus();
  }

  /**
   * Handle `before-detach` messages sent to the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this._input.removeEventListener('keydown', this);
  }

  private _future: Kernel.IShellFuture = null;
  private _input: HTMLInputElement = null;
  private _value: string;
  private _promise = new PromiseDelegate<void>();
}

export namespace Stdin {
  /**
   * The options to create a stdin widget.
   */
  export interface IOptions {
    /**
     * The prompt text.
     */
    prompt: string;

    /**
     * Whether the input is a password.
     */
    password: boolean;

    /**
     * The kernel future associated with the request.
     */
    future: Kernel.IShellFuture;
  }
}

/******************************************************************************
 * Private namespace
 ******************************************************************************/

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Create the node for an InputWidget.
   */
  export function createInputWidgetNode(
    prompt: string,
    password: boolean
  ): HTMLElement {
    let node = document.createElement('div');
    let promptNode = document.createElement('pre');
    promptNode.className = STDIN_PROMPT_CLASS;
    promptNode.textContent = prompt;
    let input = document.createElement('input');
    input.className = STDIN_INPUT_CLASS;
    if (password) {
      input.type = 'password';
    }
    node.appendChild(promptNode);
    promptNode.appendChild(input);
    return node;
  }

  /**
   * A renderer for IFrame data.
   */
  export class IsolatedRenderer extends Widget
    implements IRenderMime.IRenderer {
    /**
     * Create an isolated renderer.
     */
    constructor(wrapped: IRenderMime.IRenderer) {
      super({ node: document.createElement('iframe') });
      this.addClass('jp-mod-isolated');

      this._wrapped = wrapped;

      // Once the iframe is loaded, the subarea is dynamically inserted
      let iframe = this.node as HTMLIFrameElement;

      iframe.frameBorder = '0';
      iframe.scrolling = 'auto';

      iframe.addEventListener('load', () => {
        // Workaround needed by Firefox, to properly render svg inside
        // iframes, see https://stackoverflow.com/questions/10177190/
        // svg-dynamically-added-to-iframe-does-not-render-correctly
        iframe.contentDocument.open();

        // Insert the subarea into the iframe
        // We must directly write the html. At this point, subarea doesn't
        // contain any user content.
        iframe.contentDocument.write(this._wrapped.node.innerHTML);

        iframe.contentDocument.close();

        let body = iframe.contentDocument.body;

        // Adjust the iframe height automatically
        iframe.style.height = body.scrollHeight + 'px';
      });
    }

    /**
     * Render a mime model.
     *
     * @param model - The mime model to render.
     *
     * @returns A promise which resolves when rendering is complete.
     *
     * #### Notes
     * This method may be called multiple times during the lifetime
     * of the widget to update it if and when new data is available.
     */
    renderModel(model: IRenderMime.IMimeModel): Promise<void> {
      return this._wrapped.renderModel(model).then(() => {
        let win = (this.node as HTMLIFrameElement).contentWindow;
        if (win) {
          win.location.reload();
        }
      });
    }

    private _wrapped: IRenderMime.IRenderer;
  }
}
