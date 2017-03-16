// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel, KernelMessage
} from '@jupyterlab/services';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  ISignal
} from '@phosphor/signaling';

import {
  Message
} from '@phosphor/messaging';

import {
  MimeData
} from '@phosphor/coreutils';

import {
  Drag
} from '@phosphor/dragdrop';

import {
  Panel, PanelLayout
} from '@phosphor/widgets';

import {
  Widget
} from '@phosphor/widgets';

import {
  ObservableVector, nbformat
} from '@jupyterlab/coreutils';

import {
  IOutputModel, RenderMime
} from '@jupyterlab/rendermime';


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
const OUTPUT_AREA_CLASS = 'jp-OutputAreaWidget';

/**
 * The class name added to a "mirrored" output area widget created by a drag.
 */
const MIRRORED_OUTPUT_AREA_CLASS = 'jp-MirroredOutputArea';

/**
 * The class name added to an child widget.
 */
const CHILD_CLASS = 'jp-OutputAreaWidget-child';

/**
 * The class name added to output area gutters.
 */
const GUTTER_CLASS = 'jp-OutputAreaWidget-gutter';

/**
 * The class name added to output area outputs.
 */
const OUTPUT_CLASS = 'jp-OutputAreaWidget-output';

/**
 * The class name added to an execution result.
 */
const EXECTUTE_CLASS = 'jp-OutputAreaWidget-executeResult';

/**
 * The class name added to stdin data.
 */
const STDIN_CLASS = 'jp-OutputAreaWidget-stdin';

/**
 * The class name added to stdin data prompt nodes.
 */
const STDIN_PROMPT_CLASS = 'jp-StdinWidget-prompt';

/**
 * The class name added to stdin data input nodes.
 */
const STDIN_INPUT_CLASS = 'jp-StdinWidget-input';

/**
 * The class name added to stdin rendered text nodes.
 */
const STDIN_RENDERED_CLASS = 'jp-StdinWidget-rendered';

/**
 * The class name added to fixed height output areas.
 */
const FIXED_HEIGHT_CLASS = 'jp-mod-fixedHeight';

/**
 * The class name added to collaped output areas.
 */
const COLLAPSED_CLASS = 'jp-mod-collapsed';


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
    let model = this.model = options.model;
    this.addClass(OUTPUT_AREA_CLASS);
    this.rendermime = options.rendermime;
    this.contentFactory = (
      options.contentFactory || OutputAreaWidget.defaultContentFactory
    );
    this.layout = new PanelLayout();
    for (let i = 0; i < model.length; i++) {
      let output = model.get(i);
      this._insertOutput(i, output);
    }
    model.changed.connect(this.onModelChanged, this);
  }

  /**
   * Create a mirrored output area widget.
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
  get widgets(): ReadonlyArray<Widget> {
    return (this.layout as PanelLayout).widgets;
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
   * Execute code on a kernel and handle response messages.
   */
  execute(code: string, kernel: Kernel.IKernel): Promise<KernelMessage.IExecuteReplyMsg> {
    // Bail if the model is disposed.
    if (this.model.isDisposed) {
      return Promise.reject('Model is disposed');
    }
    // Override the default for `stop_on_error`.
    let content: KernelMessage.IExecuteRequest = {
      code,
      stop_on_error: true
    };
    this.model.clear();
    // Make sure there were no input widgets.
    if (this.widgets.length) {
      this._clear();
    }
    return new Promise<KernelMessage.IExecuteReplyMsg>((resolve, reject) => {
      // Bail if the model is disposed.
      if (this.model.isDisposed) {
        return Promise.reject('Model is disposed');
      }
      let future = kernel.requestExecute(content);
      // Handle published messages.
      future.onIOPub = (msg: KernelMessage.IIOPubMessage) => {
        this._onIOPub(msg);
      };
      // Handle the execute reply.
      future.onReply = (msg: KernelMessage.IExecuteReplyMsg) => {
        this._onExecuteReply(msg);
        resolve(msg);
      };
      // Handle stdin.
      future.onStdin = (msg: KernelMessage.IStdinMessage) => {
        if (KernelMessage.isInputRequestMsg(msg)) {
          this._onInputRequest(msg, kernel);
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
   * Follow changes on the model state.
   */
  protected onModelChanged(sender: IOutputAreaModel, args: IOutputAreaModel.ChangedArgs): void {
    switch (args.type) {
    case 'add':
      this._insertOutput(args.newIndex, args.newValues[0]);
      break;
    case 'remove':
      // Only clear is supported by the model.
      if (this.widgets.length) {
        this._clear();
      }
      break;
    case 'set':
      this._setOutput(args.newIndex, args.newValues[0]);
      break;
    default:
      break;
    }
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
   * Handle an iopub message.
   */
  private _onIOPub(msg: KernelMessage.IIOPubMessage): void {
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
  private _onExecuteReply(msg: KernelMessage.IExecuteReplyMsg): void {
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
  private _onInputRequest(msg: KernelMessage.IInputRequestMsg, kernel: Kernel.IKernel): void {
    // Add an output widget to the end.
    let factory = this.contentFactory;
    let prompt = msg.content.prompt;
    let password = msg.content.password;

    let panel = new Panel();
    panel.addClass(CHILD_CLASS);
    panel.addClass(STDIN_CLASS);

    let gutter = factory.createGutter();
    gutter.addClass(GUTTER_CLASS);
    panel.addWidget(gutter);

    let input = factory.createStdin({ prompt, password, kernel });
    input.addClass(STDIN_CLASS);
    panel.addWidget(input);

    let layout = this.layout as PanelLayout;
    layout.addWidget(panel);
  }

  /**
   * Insert an output to the layout.
   */
  private _insertOutput(index: number, model: IOutputModel): void {
    let panel = new Panel();
    panel.addClass(CHILD_CLASS);
    panel.addClass(OUTPUT_CLASS);

    let gutter = this.contentFactory.createGutter();
    gutter.executionCount = model.executionCount;
    gutter.addClass(GUTTER_CLASS);
    panel.addWidget(gutter);

    let output = this._createOutput(model);
    output.toggleClass(EXECTUTE_CLASS, model.executionCount !== null);
    panel.addWidget(output);

    let layout = this.layout as PanelLayout;
    layout.insertWidget(index, panel);
  }

  /**
   * Update an output in place.
   */
  private _setOutput(index: number, model: IOutputModel): void {
    let layout = this.layout as PanelLayout;
    let widgets = this.widgets;
    // Skip any stdin widgets to find the correct index.
    for (let i = 0; i < index; i++) {
      if (widgets[i].hasClass(STDIN_CLASS)) {
        index++;
      }
    }
    layout.widgets[index].dispose();
    this._insertOutput(index, model);
  }

  /**
   * Create an output.
   */
  private _createOutput(model: IOutputModel): Widget {
    let widget = this.rendermime.render(model);
    widget.addClass(CHILD_CLASS);
    widget.addClass(OUTPUT_CLASS);
    return widget;
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
     * The model used by the widget.
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
   * The interface for a gutter widget.
   */
  export
  interface IGutterWidget extends Widget {
    /**
     * The execution count for the widget.
     */
    executionCount: nbformat.ExecutionCount;
  }

  /**
   * The options to create a stdin widget.
   */
  export
  interface IStdinOptions {
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

  /**
   * An output widget content factory.
   */
  export
  interface IContentFactory {
    /**
     * Create a gutter for an output or input.
     *
     */
    createGutter(): IGutterWidget;

    /**
     * Create an stdin widget.
     */
    createStdin(options: IStdinOptions): Widget;
  }

  /**
   * The default implementation of `IContentFactory`.
   */
  export
  class ContentFactory implements IContentFactory {
    /**
     * Create the gutter for the widget.
     */
    createGutter(): IGutterWidget {
      return new GutterWidget();
    }

    /**
     * Create an stdin widget.
     */
    createStdin(options: IStdinOptions): Widget {
      return new StdinWidget(options);
    }
  }

  /**
   * The default `ContentFactory` instance.
   */
  export
  const defaultContentFactory = new ContentFactory();

  /**
   * The default stdin widget.
   */
  export
  class StdinWidget extends Widget {
    /**
     * Construct a new input widget.
     */
    constructor(options: IStdinOptions) {
      super({ node: Private.createInputWidgetNode() });
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
   * The default output gutter.
   */
  export
  class GutterWidget extends Widget {
    /**
     * The execution count for the widget.
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
    private _executionCount: nbformat.ExecutionCount = null;
  }
}


/**
 * The model for an output area.
 */
export
interface IOutputAreaModel extends IDisposable {
  /**
   * A signal emitted when the model state changes.
   */
  readonly stateChanged: ISignal<IOutputAreaModel, void>;

  /**
   * A signal emitted when the model changes.
   */
  readonly changed: ISignal<IOutputAreaModel, IOutputAreaModel.ChangedArgs>;

  /**
   * The length of the items in the model.
   */
  readonly length: number;

  /**
   * Whether the output area is trusted.
   */
  trusted: boolean;

  /**
   * The output content factory used by the model.
   */
  readonly contentFactory: IOutputAreaModel.IContentFactory;

  /**
   * Get an item at the specified index.
   */
  get(index: number): IOutputModel;

  /**
   * Add an output, which may be combined with previous output.
   *
   * #### Notes
   * The output bundle is copied.
   * Contiguous stream outputs of the same `name` are combined.
   */
  add(output: nbformat.IOutput): number;

  /**
   * Clear all of the output.
   *
   * @param wait - Delay clearing the output until the next message is added.
   */
  clear(wait?: boolean): void;

  /**
   * Deserialize the model from JSON.
   *
   * #### Notes
   * This will clear any existing data.
   */
  fromJSON(values: nbformat.IOutput[]): void;

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IOutput[];
}


/**
 * The namespace for IOutputAreaModel interfaces.
 */
export
namespace IOutputAreaModel {
  /**
   * The options used to create a output area model.
   */
  export
  interface IOptions {
    /**
     * The initial values for the model.
     */
    values?: nbformat.IOutput[];

    /**
     * Whether the output is trusted.  The default is false.
     */
    trusted?: boolean;

    /**
     * The output content factory used by the model.
     *
     * If not given, a default factory will be used.
     */
    contentFactory?: IContentFactory;
  }

  /**
   * A type alias for changed args.
   */
  export
  type ChangedArgs = ObservableVector.IChangedArgs<IOutputModel>;

  /**
   * The interface for an output content factory.
   */
  export
  interface IContentFactory {
    /**
     * Create an output model.
     */
    createOutputModel(options: IOutputModel.IOptions): IOutputModel;
  }
}


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
