// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel, nbformat
} from '@jupyterlab/services';

import {
  each
} from 'phosphor/lib/algorithm/iteration';

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  ISequence
} from 'phosphor/lib/algorithm/sequence';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  MimeData
} from 'phosphor/lib/core/mimedata';

import {
  defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  Drag
} from 'phosphor/lib/dom/dragdrop';

import {
  PanelLayout
} from 'phosphor/lib/ui/panel';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  ObservableVector
} from '../common/observablevector';

import {
  RenderMime
} from '../rendermime';

import {
  IOutputAreaModel, OutputAreaModel
} from './model';


/**
 * The threshold in pixels to start a drag event.
 */
const DRAG_THRESHOLD = 5;

/**
 * The factory MIME type supported by phosphor dock panels.
 */
const FACTORY_MIME = 'application/vnd.phosphor.widget-factory';

/**
 * The class name added to an output area widget.
 */
const OUTPUT_AREA_CLASS = 'jp-OutputArea';

/**
 * The class name added to a "mirrored" output area widget created by a drag.
 */
const MIRRORED_OUTPUT_AREA_CLASS = 'jp-MirroredOutputArea';

/**
 * The class name added to an output widget.
 */
const OUTPUT_CLASS = 'jp-Output';

/**
 * The class name added to an execute result.
 */
const EXECUTE_CLASS = 'jp-Output-executeResult';

/**
 * The class name added to display data.
 */
const DISPLAY_CLASS = 'jp-Output-displayData';

/**
 * The class name added to stdout data.
 */
const STDOUT_CLASS = 'jp-Output-stdout';

/**
 * The class name added to stderr data.
 */
const STDERR_CLASS = 'jp-Output-stderr';

/**
 * The class name added to error data.
 */
const ERROR_CLASS = 'jp-Output-error';

/**
 * The class name added to stdin data.
 */
const STDIN_CLASS = 'jp-Output-stdin';

/**
 * The class name added to stdin data prompt nodes.
 */
const STDIN_PROMPT_CLASS = 'jp-Output-stdinPrompt';

/**
 * The class name added to stdin data input nodes.
 */
const STDIN_INPUT_CLASS = 'jp-Output-stdinInput';

/**
 * The class name added to stdin rendered text nodes.
 */
const STDIN_RENDERED_CLASS = 'jp-Output-stdinRendered';

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
const PROMPT_CLASS = 'jp-Output-prompt';

/**
 * The class name added to output area results.
 */
const RESULT_CLASS = 'jp-Output-result';


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
class OutputAreaWidget extends Widget {
  /**
   * Construct an output area widget.
   */
  constructor(options: OutputAreaWidget.IOptions) {
    super();
    this.model = options.model;
    this.addClass(OUTPUT_AREA_CLASS);
    this.rendermime = options.rendermime;
    this.contentFactory = (
      options.contentFactory || OutputAreaWidget.defaultContentFactory
    );
    this.layout = new PanelLayout();
    model.changed.connect(this.onModelChanged, this);
  }

  /**
   * Create a mirrored output widget.
   */
  mirror(): OutputAreaWidget {
    let rendermime = this.rendermime;
    let contentFactory = this.contentFactory;
    let model = this.model;
    let widget = new OutputAreaWidget({ model, rendermime, contentFactory });
    widget.title.label = 'Mirrored Output';
    widget.title.closable = true;
    widget.addClass(MIRRORED_OUTPUT_AREA_CLASS);
    return widget;
  }

  /**
   * The model used by the widget.
   */
  readonly model: IOutputAreaModel;

  /**
   * Te rendermime instance used by the widget.
   */
  readonly rendermime: RenderMime;

  /**
   * The content factory used by the widget.
   */
  readonly contentFactory: OutputAreaWidget.IContentFactory;

  /**
   * A read-only sequence of the widgets in the output area.
   */
  get widgets(): ISequence<OutputWidget> {
    return (this.layout as PanelLayout).widgets as ISequence<OutputWidget>;
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
    this._model = null;
    super.dispose();
  }

  /**
   * Clear the widget inputs and outputs.
   */
  clear(): void {
    // Bail if there is no work to do.
    if (!this.widgets.length) {
      return;
    }

    // Remove all of our widgets.
    for (let i = 0; i < this.widgets.length; i++) {
      this.widgets.at(0).dispose();
    }

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
    this._minHeightTimeout = setTimeout(() => {
      if (this.isDisposed) {
        return;
      }
      this.node.style.minHeight = '';
    }, 50);
  }

  /**
   * Execute code on a kernel and send outputs to the model.
   */
  execute(code: string, kernel: Kernel.IKernel): Promise<KernelMessage.IExecuteReplyMsg> {
    // Override the default for `stop_on_error`.
    let content: KernelMessage.IExecuteRequest = {
      code,
      stop_on_error: true
    };
    this.model.clear();
    // Make sure there were no input widgets.
    this.clear();
    return new Promise<KernelMessage.IExecuteReplyMsg>((resolve, reject) => {
      let future = kernel.requestExecute(content);
      // Handle published messages.
      future.onIOPub = (msg: KernelMessage.IIOPubMessage) => {
        this.onIOPub(msg);
      };
      // Handle the execute reply.
      future.onReply = (msg: KernelMessage.IExecuteReplyMsg) => {
        this.onExecuteReply(msg);
        resolve(msg);
      };
      // Handle stdin.
      future.onStdin = (msg: KernelMessage.IStdinMessage) => {
        if (KernelMessage.isInputRequestMsg(msg)) {
          this.onInputRequest(msg, kernel);
        }
      };
    });
  }

  /**
   * Handle `update-request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    this.toggleClass(COLLAPSED_CLASS, this.collapsed);
    this.toggleClass(FIXED_HEIGHT_CLASS, this.fixedHeight);
  }

  /**
   * Handle an iopub message.
   */
  protected onIOPub(msg: KernelMessage.IIOPubMessage): void {
    let model = this.model;
    let msgType = msg.header.msg_type;
    switch (msgType) {
    case 'execute_result':
    case 'display_data':
    case 'stream':
    case 'error':
      let output = msg.content as nbformat.IOutput;
      output.output_type = msgType as nbformat.OutputType;
      model.add(output);
      break;
    case 'clear_output':
      let wait = (msg as KernelMessage.IClearOutputMsg).content.wait;
      model.clear(wait);
      break;
    default:
      break;
    }
  }

  /**
   * Handle an execute reply message.
   */
  protected onExecuteReply(msg: KernelMessage.IExecuteReplyMsg): void {
    // API responses that contain a pager are special cased and their type
    // is overriden from 'execute_reply' to 'display_data' in order to
    // render output.
    let model = this.model;
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
    let output: nbformat.IOutput = {
      output_type: 'display_data',
      data: (page as any).data as nbformat.IMimeBundle,
      metadata: {}
    };
    model.add(output);
  }

  /**
   * Handle an input request from a kernel.
   */
  protected onInputRequest(msg: KernelMessage.IInputRequestMsg, kernel: Kernel.IKernel): void {
    // Add an output widget to the end.
    let prompt = msg.content.prompt;
    let password = msg.content.password;
    let widget = this.contentFactory.createInput({ prompt, password, kernel });
    let layout = this.layout as PanelLayout;
    layout.addWidget(widget);
  }

  /**
   * Add an output to the layout.
   */
  protected addOutput(model: OutputAreaModel.IModel): void {
    let rendermime = this.rendermime;
    let widget = this.contentFactory.createOutput({ rendermime, model });
    let layout = this.layout as PanelLayout;
    layout.addWidget(widget);
  }

  /**
   * Update an output in place.
   */
  protected setOutput(index: number, model: OutputAreaModel.IModel): void {
    let layout = this.layout as PanelLayout;
    let widgets = this.widgets;
    // Skip any input widgets to find the correct index.
    for (i = 0; i < index; i++) {
      if (widgets.at(i) instanceof InputWidget) {
        index++;
      }
    }
    layout.widgets.at(index).dispose();
    let rendermime = this.rendermime;
    let widget = this.contentFactory.createOutput({ rendermime, model });
    layout.insertWidget(index, widget);
  }

  /**
   * Follow changes on the model state.
   */
  protected onModelChanged(sender: IOutputAreaModel, args: ObservableVector.IChangedArgs<OutputAreaModel.IOutput>) {
    switch (args.type) {
    case 'add':
      // Children are always added at the end.
      this.addOutput(args.newValue);
      break;
    case 'remove':
      // Only clear is supported by the model.
      this.clear();
      break;
    case 'set':
      this.updateOutput(args.newIndex, args.newValue);
      break;
    default:
      break;
    }
  }

  private _fixedHeight = false;
  private _collapsed = false;
  private _minHeightTimeout: number = null;
}


/**
 * A namespace for OutputAreaWidget statics.
 */
export
namespace OutputAreaWidget {
  /**
   * The options to pass to an `OutputAreaWidget`.
   */
  export
  interface IOptions {
    /**
     * The rendermime instance used by the widget.
     */
    rendermime: RenderMime;

    /**
     * The output area model used by the widget.
     */
    model: IOutputAreaModel;

    /**
     * The output widget content factory.
     *
     * Defaults to a shared `IContentFactory` instance.
     */
     contentFactory?: IContentFactory;
  }

  /**
   * An output widget content factory.
   */
  export
  interface IContentFactory {
    /**
     * Create an output widget.
     */
    createOutput(options: OutputWidget.IOptions): OutputWidget;

    /**
     * Create an input widget.
     */
    createInput(options: InputWidget.IOptions): InputWidget;
  }

  /**
   * The default implementation of `IContentFactory`.
   */
  export
  class ContentFactory implements IContentFactory {
    /**
     * Create an output widget.
     */
    createOutput(options: OutputWidget.IOptions): OutputWidget {
      return new OutputWidget(options);
    }

    /**
     * Create an input widget.
     */
    createInput(options: InputWidget.IOptions): InputWidget {
      return new InputWidget(options);
    }
  }

  /**
   * The default `ContentFactory` instance.
   */
  export
  const defaultContentFactory = new ContentFactory();
}


/**
 * The gutter on the left side of the OutputWidget
 */
export
class OutputGutter extends Widget {
  /**
   * Handle the DOM events for the output gutter widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the panel's DOM node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
    case 'mousedown':
      this._evtMousedown(event as MouseEvent);
      break;
    case 'mouseup':
      this._evtMouseup(event as MouseEvent);
      break;
    case 'mousemove':
      this._evtMousemove(event as MouseEvent);
      break;
    default:
      break;
    }
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('mousedown', this);
  }

  /**
   * A message handler invoked on a `'before-detach'` message.
   */
  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    let node = this.node;
    node.removeEventListener('mousedown', this);
  }

  /**
   * Handle the `'mousedown'` event for the widget.
   */
  private _evtMousedown(event: MouseEvent): void {
    // Left mouse press for drag start.
    if (event.button === 0) {
      this._dragData = { pressX: event.clientX, pressY: event.clientY };
      document.addEventListener('mouseup', this, true);
      document.addEventListener('mousemove', this, true);
    }
  }

  /**
   * Handle the `'mouseup'` event for the widget.
   */
  private _evtMouseup(event: MouseEvent): void {
    if (event.button !== 0 || !this._drag) {
      document.removeEventListener('mousemove', this, true);
      document.removeEventListener('mouseup', this, true);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle the `'mousemove'` event for the widget.
   */
  private _evtMousemove(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // Bail if we are the one dragging.
    if (this._drag) {
      return;
    }

    // Check for a drag initialization.
    let data = this._dragData;
    let dx = Math.abs(event.clientX - data.pressX);
    let dy = Math.abs(event.clientY - data.pressY);
    if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
      return;
    }

    this._startDrag(event.clientX, event.clientY);
  }

  /**
   * Start a drag event.
   */
  private _startDrag(clientX: number, clientY: number): void {
    // Set up the drag event.
    this._drag = new Drag({
      mimeData: new MimeData(),
      supportedActions: 'copy',
      proposedAction: 'copy'
    });

    this._drag.mimeData.setData(FACTORY_MIME, () => {
      let outputArea = this.parent.parent as OutputAreaWidget;
      return outputArea.mirror();
    });

    // Remove mousemove and mouseup listeners and start the drag.
    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('mouseup', this, true);
    this._drag.start(clientX, clientY).then(action => {
      this._drag = null;
    });
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose() {
    this._dragData = null;
    this._drag = null;
    super.dispose();
  }

  private _drag: Drag = null;
  private _dragData: { pressX: number, pressY: number } = null;
}


/**
 * An output widget.
 */
export
class OutputWidget extends Widget {
  /**
   * Construct a new output widget.
   */
  constructor(options: OutputWidget.IOptions) {
    super();
    let layout = new PanelLayout();
    this.layout = layout;
    let prompt = new OutputGutter();
    this.addClass(OUTPUT_CLASS);
    prompt.addClass(PROMPT_CLASS);
    let result = this.createChild(options);
    result.addClass(RESULT_CLASS);
    layout.addWidget(prompt);
    layout.addWidget(result);
  }

  /**
   * The prompt widget used by the output widget.
   */
  get prompt(): Widget {
    let layout = this.layout as PanelLayout;
    return layout.widgets.at(0);
  }

  /**
   * The rendered output used by the output widget.
   */
  get output(): Widget {
    let layout = this.layout as PanelLayout;
    return layout.widgets.at(1);
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this._rendermime = null;
    this._placeholder = null;
    super.dispose();
  }

  /**
   * Render an output.
   */
  protected createChild(options: OutputWidget.IOptions): void {
    let widget = options.rendermime.render(options.model);

    // Create the output result area.
    if (!widget) {
      console.warn('Did not find renderer for output mimebundle.');
      return new Widget();
      return;
    }

    // Add classes and output prompt as necessary.
    let output = model.toJSON();
    switch (output.type) {
    case 'execute_result':
      child.addClass(EXECUTE_CLASS);
      let count = (output as nbformat.IExecuteResult).execution_count;
      this.prompt.node.textContent = `Out[${count === null ? ' ' : count}]:`;
      break;
    case 'display_data':
      child.addClass(DISPLAY_CLASS);
      break;
    case 'stream':
      if ((output as nbformat.IStream).name === 'stdout') {
        child.addClass(STDOUT_CLASS);
      } else {
        child.addClass(STDERR_CLASS);
      }
      break;
    case 'error':
      child.addClass(ERROR_CLASS);
      break;
    default:
      break;
    }
  }
}


/**
 * A namespace for OutputArea class statics.
 */
export
namespace OutputWidget {
  /**
   * The options to pass to an `OutputWidget`.
   */
  export
  interface IOptions {
    /**
     * The rendered output widget.
     */
    rendermime: RenderMime;

    /**
     * The model to render.
     */
    model: OutputAreaModel.IOutput;
  }
}


/**
 * A widget that handles stdin requests from the kernel.
 */
export
class InputWidget extends Widget {
  /**
   * Construct a new input widget.
   */
  constructor(options: InputWidget.IOptions) {
    super({ node: Private.createInputWidgetNode() });
    this.addClass(STDIN_CLASS);
    let text = this.node.firstChild as HTMLElement;
    text.textContent = options.prompt;
    this._input = this.node.lastChild as HTMLInputElement;
    if (options.password) {
      this._input.type = 'password';
    }
    this._kernel = options.kernel;
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
        this._kernel.sendInputReply({
          value: input.value
        });
        let rendered = document.createElement('span');
        rendered.className = STDIN_RENDERED_CLASS;
        if (input.type === 'password') {
          rendered.textContent = Array(input.value.length + 1).join('·');
        } else {
          rendered.textContent = input.value;
        }
        this.node.replaceChild(rendered, input);
      }
      // Suppress keydown events from leaving the input.
      event.stopPropagation();
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

  private _kernel: Kernel.IKernel = null;
  private _input: HTMLInputElement = null;
}


/**
 * A namespace for InputWidget class statics.
 */
export
namespace InputWidget {
  /**
   * The options to pass to an `InputWidget`.
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
     * The kernel associated with the request.
     */
    kernel: Kernel.IKernel;
  }
}



// Define the signals for the `OutputAreaWidget` class.
defineSignal(OutputAreaWidget.prototype, 'modelChanged');
defineSignal(OutputAreaWidget.prototype, 'modelDisposed');


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * Create the node for an InputWidget.
   */
  export
  function createInputWidgetNode(): HTMLElement {
    let node = document.createElement('div');
    let prompt = document.createElement('span');
    prompt.className = STDIN_PROMPT_CLASS;
    let input = document.createElement('input');
    input.className = STDIN_INPUT_CLASS;
    node.appendChild(prompt);
    node.appendChild(input);
    return node;
  }
}
