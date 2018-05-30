// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject, ReadonlyJSONObject
} from '@phosphor/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  Signal
} from '@phosphor/signaling';

import {
  Panel, PanelLayout
} from '@phosphor/widgets';

import {
  Widget
} from '@phosphor/widgets';

import {
  IClientSession
} from '@jupyterlab/apputils';

import {
  nbformat
} from '@jupyterlab/coreutils';

import {
 IOutputModel, RenderMimeRegistry
} from '@jupyterlab/rendermime';

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import {
  Kernel, KernelMessage
} from '@jupyterlab/services';

import {
  IOutputAreaModel
} from './model';


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

/**
 * The class name added to stdin rendered text nodes.
 */
const STDIN_RENDERED_CLASS = 'jp-Stdin-rendered';


/******************************************************************************
 * OutputArea
 ******************************************************************************/


/**
 * An output area widget.
 *
 * #### Notes
 * The widget model must be set separately and can be changed
 * at any time.  Consumers of the widget must account for a
 * `null` model, and may want to listen to the `modelChanged`
 * signal.
 */
export
class OutputArea extends Widget {
  /**
   * Construct an output area widget.
   */
  constructor(options: OutputArea.IOptions) {
    super();
    let model = this.model = options.model;
    this.addClass(OUTPUT_AREA_CLASS);
    this.rendermime = options.rendermime;
    this.contentFactory = (
      options.contentFactory || OutputArea.defaultContentFactory
    );
    this.layout = new PanelLayout();
    for (let i = 0; i < model.length; i++) {
      let output = model.get(i);
      this._insertOutput(i, output);
    }
    model.changed.connect(this.onModelChanged, this);
    model.stateChanged.connect(this.onStateChanged, this);
  }

  /**
   * The model used by the widget.
   */
  readonly model: IOutputAreaModel;

  /**
   * The content factory used by the widget.
   */
  readonly contentFactory: OutputArea.IContentFactory;

  /**
   * Te rendermime instance used by the widget.
   */
  readonly rendermime: RenderMimeRegistry;

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
  get future(): Kernel.IFuture {
    return this._future;
  }

  set future(value: Kernel.IFuture) {
    // Bail if the model is disposed.
    if (this.model.isDisposed) {
      throw Error('Model is disposed');
    }
    if (this._future === value) {
      return;
    }
    if (this._future) {
      this._future.dispose();
    }
    this._future = value;

    this.model.clear();

    // Make sure there were no input widgets.
    if (this.widgets.length) {
      this._clear();
      this.outputLengthChanged.emit(this.model.length);
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
    super.dispose();
  }

  /**
   * Follow changes on the model state.
   */
  protected onModelChanged(sender: IOutputAreaModel, args: IOutputAreaModel.ChangedArgs): void {
    let layoutIndex;
    switch (args.type) {
    case 'add':
      layoutIndex = this._modelToLayoutIndex(args.newIndex);
      this._insertOutput(layoutIndex, args.newValues[0]);
      this.outputLengthChanged.emit(this.model.length);
      break;
    case 'remove':
      // Only clear is supported by the model.
      if (this.widgets.length) {
        this._clear();
        this.outputLengthChanged.emit(this.model.length);
      }
      break;
    case 'set':
      layoutIndex = this._modelToLayoutIndex(args.newIndex);
      this._setOutput(layoutIndex, args.newValues[0]);
      this.outputLengthChanged.emit(this.model.length);
      break;
    default:
      break;
    }
  }

  /**
   * Follow changes on the output model state.
   */
  protected onStateChanged(sender: IOutputAreaModel): void {
    for (let i = 0; i < this.model.length; i++) {
      this._setOutput(i, this.model.get(i));
    }
    this.outputLengthChanged.emit(this.model.length);
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
  protected onInputRequest(msg: KernelMessage.IInputRequestMsg, future: Kernel.IFuture): void {
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
  }

  /**
   * Update an output in the layout in place.
   */
  private _setOutput(index: number, model: IOutputModel): void {
    let layout = this.layout as PanelLayout;
    let panel = layout.widgets[index] as Panel;
    let renderer = (panel.widgets ? panel.widgets[1] : panel) as IRenderMime.IRenderer;
    if (renderer.renderModel) {
      renderer.renderModel(model);
    } else {
      layout.widgets[index].dispose();
      this._insertOutput(index, model);
    }
  }

  /**
   * Render and insert a single output into the layout.
   */
  private _insertOutput(index: number, model: IOutputModel): void {
    let output = this.createOutputItem(model);
    output.toggleClass(EXECUTE_CLASS, model.executionCount !== null);
    let layout = this.layout as PanelLayout;
    layout.insertWidget(index, output);
  }

  /**
   * Adjust the model index to the widgets index (skipping stdin widgets).
   */
  private _modelToLayoutIndex(index: number) {
    let widgets = this.widgets;
    let modelOutputs = -1;
    let i;

    for (i = 0; i < widgets.length; i++) {
      if (!widgets[i].hasClass(OUTPUT_AREA_STDIN_ITEM_CLASS)) {
        modelOutputs++;
        if (modelOutputs === index) {
          break;
        }
      }
    }
    return i;
  }

  /**
   * Create an output item with a prompt and actual output
   */
  protected createOutputItem(model: IOutputModel): Widget {
    let panel = new Panel();
    panel.addClass(OUTPUT_AREA_ITEM_CLASS);

    let prompt = this.contentFactory.createOutputPrompt();
    prompt.executionCount = model.executionCount;
    prompt.addClass(OUTPUT_AREA_PROMPT_CLASS);
    panel.addWidget(prompt);

    let output = this.createRenderedMimetype(model);
    output.addClass(OUTPUT_AREA_OUTPUT_CLASS);
    panel.addWidget(output);

    return panel;
  }

  /**
   * Render a mimetype
   */
  protected createRenderedMimetype(model: IOutputModel): Widget {
    let widget: Widget;
    let mimeType = this.rendermime.preferredMimeType(
      model.data, model.trusted ? 'any' : 'ensure'
    );
    if (mimeType) {
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
        output.node.innerHTML = `<pre>Javascript Error: ${error.message}</pre>`;
        // Remove mime-type-specific CSS classes
        output.node.className = 'p-Widget jp-RenderedText';
        output.node.setAttribute('data-mime-type', 'application/vnd.jupyter.stderr');
      });
      widget = output;
    } else {
      widget = new Widget();
      widget.node.innerHTML =
        `No ${model.trusted ? '' : '(safe) '}renderer could be ` +
        'found for output. It has the following MIME types: ' +
        Object.keys(model.data).join(', ');
    }
    return widget;
  }

  /**
   * Handle an iopub message.
   */
  private _onIOPub = (msg: KernelMessage.IIOPubMessage) => {
    let model = this.model;
    let msgType = msg.header.msg_type;
    let output: nbformat.IOutput;
    let transient = (msg.content.transient || {}) as JSONObject;
    let displayId = transient['display_id'] as string;
    let targets: number[];

    switch (msgType) {
    case 'execute_result':
    case 'display_data':
    case 'stream':
    case 'error':
      output = msg.content as nbformat.IOutput;
      output.output_type = msgType as nbformat.OutputType;
      model.add(output);
      break;
    case 'clear_output':
      let wait = (msg as KernelMessage.IClearOutputMsg).content.wait;
      model.clear(wait);
      break;
    case 'update_display_data':
      output = msg.content as nbformat.IOutput;
      output.output_type = 'display_data';
      targets = this._displayIdMap.get(displayId);
      if (targets) {
        for (let index of targets) {
          model.set(index, output);
        }
      }
      break;
    default:
      break;
    }
    if (displayId && msgType === 'display_data') {
       targets = this._displayIdMap.get(displayId) || [];
       targets.push(model.length - 1);
       this._displayIdMap.set(displayId, targets);
    }
  }

  /**
   * Handle an execute reply message.
   */
  private _onExecuteReply = (msg: KernelMessage.IExecuteReplyMsg) => {
    // API responses that contain a pager are special cased and their type
    // is overriden from 'execute_reply' to 'display_data' in order to
    // render output.
    let model = this.model;
    let content = msg.content as KernelMessage.IExecuteOkReply;
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
    model.add(output);
  }

  private _minHeightTimeout: number = null;
  private _future: Kernel.IFuture = null;
  private _displayIdMap = new Map<string, number[]>();
}

export
class SimplifiedOutputArea extends OutputArea {
  /**
   * Handle an input request from a kernel by doing nothing.
   */
  protected onInputRequest(msg: KernelMessage.IInputRequestMsg, future: Kernel.IFuture): void {
    return;
  }

  /**
   * Create an output item without a prompt, just the output widgets
   */
  protected createOutputItem(model: IOutputModel): Widget {
    let output = this.createRenderedMimetype(model);
    output.addClass(OUTPUT_AREA_OUTPUT_CLASS);
    return output;
  }
}


/**
 * A namespace for OutputArea statics.
 */
export
namespace OutputArea {
  /**
   * The options to create an `OutputArea`.
   */
  export
  interface IOptions {
    /**
     * The model used by the widget.
     */
    model: IOutputAreaModel;

    /**
     * The content factory used by the widget to create children.
     */
    contentFactory?: IContentFactory;

    /**
     * The rendermime instance used by the widget.
     */
    rendermime: RenderMimeRegistry;
  }

  /**
   * Execute code on an output area.
   */
  export
  function execute(code: string, output: OutputArea, session: IClientSession): Promise<KernelMessage.IExecuteReplyMsg> {
    // Override the default for `stop_on_error`.
    let content: KernelMessage.IExecuteRequest = {
      code,
      stop_on_error: true
    };

    if (!session.kernel) {
      return Promise.reject('Session has no kernel.');
    }
    let future = session.kernel.requestExecute(content, false);
    output.future = future;
    return future.done as Promise<KernelMessage.IExecuteReplyMsg>;
  }

  /**
   * An output area widget content factory.
   *
   * The content factory is used to create children in a way
   * that can be customized.
   */
  export
  interface IContentFactory {
    /**
     * Create an output prompt.
     */
    createOutputPrompt(): IOutputPrompt;

    /**
     * Create an stdin widget.
     */
    createStdin(options: Stdin.IOptions): Widget;
  }

  /**
   * The default implementation of `IContentFactory`.
   */
  export
  class ContentFactory implements IContentFactory {
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
  export
  const defaultContentFactory = new ContentFactory();
}


/******************************************************************************
 * OutputPrompt
 ******************************************************************************/


/**
 * The interface for an output prompt.
 */
export
interface IOutputPrompt extends Widget {
  /**
   * The execution count for the prompt.
   */
  executionCount: nbformat.ExecutionCount;
}

/**
 * The default output prompt implementation
 */
export
class OutputPrompt extends Widget implements IOutputPrompt {
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
        this.node.textContent = `Out[${value}]:`;
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
export
interface IStdin extends Widget {}

/**
 * The default stdin widget.
 */
export
class Stdin extends Widget implements IStdin {
  /**
   * Construct a new input widget.
   */
  constructor(options: Stdin.IOptions) {
    super({ node: Private.createInputWidgetNode(options.prompt, options.password) });
    this.addClass(STDIN_CLASS);
    this._input = this.node.getElementsByTagName('input')[0];
    this._input.focus();
    this._future = options.future;
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
      if ((event as KeyboardEvent).keyCode === 13) {  // Enter
        this._future.sendInputReply({
          value: input.value
        });
        let rendered = document.createElement('span');
        rendered.className = STDIN_RENDERED_CLASS;
        if (input.type === 'password') {
          rendered.textContent = Array(input.value.length + 1).join('·');
        } else {
          rendered.textContent = input.value;
        }
        input.parentElement.replaceChild(rendered, input);
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

  private _future: Kernel.IFuture = null;
  private _input: HTMLInputElement = null;
}


export
namespace Stdin {
  /**
   * The options to create a stdin widget.
   */
  export
  interface IOptions {
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
    future: Kernel.IFuture;
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
  export
  function createInputWidgetNode(prompt: string, password: boolean): HTMLElement {
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
  export
  class IsolatedRenderer extends Widget implements IRenderMime.IRenderer {
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
