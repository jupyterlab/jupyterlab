// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISessionContext, WidgetTracker } from '@jupyterlab/apputils';
import * as nbformat from '@jupyterlab/nbformat';
import { IObservableString } from '@jupyterlab/observables';
import { IOutputModel, IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { Kernel, KernelMessage } from '@jupyterlab/services';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import {
  JSONObject,
  PromiseDelegate,
  ReadonlyJSONObject,
  ReadonlyPartialJSONObject,
  UUID
} from '@lumino/coreutils';
import { Message } from '@lumino/messaging';
import { AttachedProperty } from '@lumino/properties';
import { ISignal, Signal } from '@lumino/signaling';
import { Panel, PanelLayout, Widget } from '@lumino/widgets';
import { IOutputAreaModel } from './model';

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

const OUTPUT_AREA_STDIN_HIDING_CLASS = 'jp-OutputArea-stdin-hiding';

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
 * The overlay that can be clicked to switch between output scrolling modes.
 */
const OUTPUT_PROMPT_OVERLAY = 'jp-OutputArea-promptOverlay';

/** ****************************************************************************
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
export class OutputArea extends Widget {
  /**
   * Construct an output area widget.
   */
  constructor(options: OutputArea.IOptions) {
    super();
    super.layout = new PanelLayout();
    this.addClass(OUTPUT_AREA_CLASS);
    this.contentFactory =
      options.contentFactory ?? OutputArea.defaultContentFactory;
    this.rendermime = options.rendermime;
    this._maxNumberOutputs = options.maxNumberOutputs ?? Infinity;
    this._translator = options.translator ?? nullTranslator;
    this._inputHistoryScope = options.inputHistoryScope ?? 'global';
    this._showInputPlaceholder = options.showInputPlaceholder ?? true;

    const model = (this.model = options.model);
    for (
      let i = 0;
      i < Math.min(model.length, this._maxNumberOutputs + 1);
      i++
    ) {
      const output = model.get(i);
      this._insertOutput(i, output);
      if (output.type === 'stream') {
        // This is a stream output, follow changes to the text.
        output.streamText!.changed.connect(
          (
            sender: IObservableString,
            event: IObservableString.IChangedArgs
          ) => {
            this._setOutput(i, output);
          }
        );
      }
    }
    model.changed.connect(this.onModelChanged, this);
    model.stateChanged.connect(this.onStateChanged, this);
    if (options.promptOverlay) {
      this._addPromptOverlay();
    }
  }

  /**
   * The content factory used by the widget.
   */
  readonly contentFactory: OutputArea.IContentFactory;

  /**
   * The model used by the widget.
   */
  readonly model: IOutputAreaModel;

  /**
   * The rendermime instance used by the widget.
   */
  readonly rendermime: IRenderMimeRegistry;

  /**
   * Narrow the type of OutputArea's layout prop
   */
  get layout(): PanelLayout {
    return super.layout as PanelLayout;
  }

  /**
   * A read-only sequence of the children widgets in the output area.
   */
  get widgets(): ReadonlyArray<Widget> {
    return this.layout.widgets;
  }

  /**
   * A public signal used to indicate the number of displayed outputs has changed.
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
  > {
    return this._future;
  }

  set future(
    value: Kernel.IShellFuture<
      KernelMessage.IExecuteRequestMsg,
      KernelMessage.IExecuteReplyMsg
    >
  ) {
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

    value.done
      .finally(() => {
        this._pendingInput = false;
      })
      .catch(() => {
        // No-op, required because `finally` re-raises any rejections,
        // even if caught on the `done` promise level before.
      });

    this.model.clear();

    // Make sure there were no input widgets.
    if (this.widgets.length) {
      this._clear();
      this.outputLengthChanged.emit(
        Math.min(this.model.length, this._maxNumberOutputs)
      );
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
   * Signal emitted when an output area is requesting an input. The signal
   * carries the input widget that this class creates in response to the input
   * request.
   */
  get inputRequested(): ISignal<OutputArea, IStdin> {
    return this._inputRequested;
  }

  /**
   * A flag indicating if the output area has pending input.
   */
  get pendingInput(): boolean {
    return this._pendingInput;
  }

  /**
   * The maximum number of output items to display on top and bottom of cell output.
   *
   * ### Notes
   * It is set to Infinity if no trim is applied.
   */
  get maxNumberOutputs(): number {
    return this._maxNumberOutputs;
  }
  set maxNumberOutputs(limit: number) {
    if (limit <= 0) {
      console.warn(`OutputArea.maxNumberOutputs must be strictly positive.`);
      return;
    }
    const lastShown = this._maxNumberOutputs;
    this._maxNumberOutputs = limit;
    if (lastShown < limit) {
      this._showTrimmedOutputs(lastShown);
    }
  }

  /**
   * Dispose of the resources used by the output area.
   */
  dispose(): void {
    if (this._future) {
      this._future.dispose();
      this._future = null!;
    }
    this._displayIdMap.clear();
    this._outputTracker.dispose();
    super.dispose();
  }

  /**
   * Follow changes on the model state.
   */
  protected onModelChanged(
    sender: IOutputAreaModel,
    args: IOutputAreaModel.ChangedArgs
  ): void {
    switch (args.type) {
      case 'add':
        const output = args.newValues[0];
        this._insertOutput(args.newIndex, output);
        if (output.type === 'stream') {
          // A stream output has been added, follow changes to the text.
          output.streamText!.changed.connect(
            (
              sender: IObservableString,
              event: IObservableString.IChangedArgs
            ) => {
              this._setOutput(args.newIndex, output);
            }
          );
        }
        break;
      case 'remove':
        if (this.widgets.length) {
          // all items removed from model
          if (this.model.length === 0) {
            this._clear();
          } else {
            // range of items removed from model
            // remove widgets corresponding to removed model items
            const startIndex = args.oldIndex;
            for (
              let i = 0;
              i < args.oldValues.length && startIndex < this.widgets.length;
              ++i
            ) {
              const widget = this.widgets[startIndex];
              widget.parent = null;
              widget.dispose();
            }

            // apply item offset to target model item indices in _displayIdMap
            this._moveDisplayIdIndices(startIndex, args.oldValues.length);

            // prevent jitter caused by immediate height change
            this._preventHeightChangeJitter();
          }
        }
        break;
      case 'set':
        this._setOutput(args.newIndex, args.newValues[0]);
        break;
      default:
        break;
    }
    this.outputLengthChanged.emit(
      Math.min(this.model.length, this._maxNumberOutputs)
    );
  }

  /**
   * Emitted when user requests toggling of the output scrolling mode.
   */
  get toggleScrolling(): ISignal<OutputArea, void> {
    return this._toggleScrolling;
  }

  get initialize(): ISignal<OutputArea, void> {
    return this._initialize;
  }

  /**
   * Add overlay allowing to toggle scrolling.
   */
  private _addPromptOverlay() {
    const overlay = document.createElement('div');
    overlay.className = OUTPUT_PROMPT_OVERLAY;
    overlay.addEventListener('click', () => {
      this._toggleScrolling.emit();
    });
    this.node.appendChild(overlay);
    requestAnimationFrame(() => {
      this._initialize.emit();
    });
  }

  /**
   * Update indices in _displayIdMap in response to element remove from model items
   *
   * @param startIndex - The index of first element removed
   *
   * @param count - The number of elements removed from model items
   *
   */
  private _moveDisplayIdIndices(startIndex: number, count: number) {
    this._displayIdMap.forEach((indices: number[]) => {
      const rangeEnd = startIndex + count;
      const numIndices = indices.length;
      // reverse loop in order to prevent removing element affecting the index
      for (let i = numIndices - 1; i >= 0; --i) {
        const index = indices[i];
        // remove model item indices in removed range
        if (index >= startIndex && index < rangeEnd) {
          indices.splice(i, 1);
        } else if (index >= rangeEnd) {
          // move model item indices that were larger than range end
          indices[i] -= count;
        }
      }
    });
  }

  /**
   * Follow changes on the output model state.
   */
  protected onStateChanged(
    sender: IOutputAreaModel,
    change: number | void
  ): void {
    const outputLength = Math.min(this.model.length, this._maxNumberOutputs);
    if (change) {
      if (change >= this._maxNumberOutputs) {
        // Bail early
        return;
      }
      this._setOutput(change, this.model.get(change));
    } else {
      for (let i = 0; i < outputLength; i++) {
        this._setOutput(i, this.model.get(i));
      }
    }
    this.outputLengthChanged.emit(outputLength);
  }

  /**
   * Clear the widget outputs.
   */
  private _clear(): void {
    // Bail if there is no work to do.
    if (!this.widgets.length) {
      return;
    }

    // Remove all of our widgets.
    const length = this.widgets.length;
    for (let i = 0; i < length; i++) {
      const widget = this.widgets[0];
      widget.parent = null;
      widget.dispose();
    }

    // Clear the display id map.
    this._displayIdMap.clear();

    // prevent jitter caused by immediate height change
    this._preventHeightChangeJitter();
  }

  private _preventHeightChangeJitter() {
    // When an output area is cleared and then quickly replaced with new
    // content (as happens with @interact in widgets, for example), the
    // quickly changing height can make the page jitter.
    // We introduce a small delay in the minimum height
    // to prevent this jitter.
    const rect = this.node.getBoundingClientRect();
    this.node.style.minHeight = `${rect.height}px`;
    if (this._minHeightTimeout) {
      window.clearTimeout(this._minHeightTimeout);
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
    const factory = this.contentFactory;
    const stdinPrompt = msg.content.prompt;
    const password = msg.content.password;

    const panel = new Panel();
    panel.addClass(OUTPUT_AREA_ITEM_CLASS);
    panel.addClass(OUTPUT_AREA_STDIN_ITEM_CLASS);

    const prompt = factory.createOutputPrompt();
    prompt.addClass(OUTPUT_AREA_PROMPT_CLASS);
    panel.addWidget(prompt);

    // Indicate that input is pending
    this._pendingInput = true;

    const input = factory.createStdin({
      parent_header: msg.header,
      prompt: stdinPrompt,
      password,
      future,
      translator: this._translator,
      inputHistoryScope: this._inputHistoryScope,
      showInputPlaceholder: this._showInputPlaceholder
    });
    input.addClass(OUTPUT_AREA_OUTPUT_CLASS);
    panel.addWidget(input);

    // Increase number of outputs to display the result up to the input request.
    if (this.model.length >= this.maxNumberOutputs) {
      this.maxNumberOutputs = this.model.length;
    }
    this._inputRequested.emit(input);

    // Get the input node to ensure focus after updating the model upon user reply.
    const inputNode = input.node.getElementsByTagName('input')[0];

    /**
     * Wait for the stdin to complete, add it to the model (so it persists)
     * and remove the stdin widget.
     */
    void input.value.then(value => {
      // Increase number of outputs to display the result of stdin if needed.
      if (this.model.length >= this.maxNumberOutputs) {
        this.maxNumberOutputs = this.model.length + 1;
      }
      panel.addClass(OUTPUT_AREA_STDIN_HIDING_CLASS);
      // Use stdin as the stream so it does not get combined with stdout.
      // Note: because it modifies DOM it may (will) shift focus away from the input node.
      this.model.add({
        output_type: 'stream',
        name: 'stdin',
        text: value + '\n'
      });
      // Refocus the input node after it lost focus due to update of the model.
      inputNode.focus();

      // Indicate that input is no longer pending
      this._pendingInput = false;

      // Keep the input in view for a little while; this (along refocusing)
      // ensures that we can avoid the cell editor stealing the focus, and
      // leading to user inadvertently modifying editor content when executing
      // consecutive commands in short succession.
      window.setTimeout(() => {
        // Tack currently focused element to ensure that it remains on it
        // after disposal of the panel with the old input
        // (which modifies DOM and can lead to focus jump).
        const focusedElement = document.activeElement;
        // Dispose the old panel with no longer needed input box.
        panel.dispose();
        // Refocus the element that was focused before.
        if (focusedElement && focusedElement instanceof HTMLElement) {
          focusedElement.focus();
        }
      }, 500);
    });

    // Note: the `input.value` promise must be listened to before we attach the panel
    this.layout.addWidget(panel);
  }

  /**
   * Update an output in the layout in place.
   */
  private _setOutput(index: number, model: IOutputModel): void {
    if (index >= this._maxNumberOutputs) {
      return;
    }
    const panel = this.layout.widgets[index] as Panel;
    const renderer = (
      panel.widgets
        ? panel.widgets.filter(it => 'renderModel' in it).pop()
        : panel
    ) as IRenderMime.IRenderer;
    // Check whether it is safe to reuse renderer:
    // - Preferred mime type has not changed
    // - Isolation has not changed
    const mimeType = this.rendermime.preferredMimeType(
      model.data,
      model.trusted ? 'any' : 'ensure'
    );
    if (
      Private.currentPreferredMimetype.get(renderer) === mimeType &&
      OutputArea.isIsolated(mimeType, model.metadata) ===
        renderer instanceof Private.IsolatedRenderer
    ) {
      void renderer.renderModel(model);
    } else {
      this.layout.widgets[index].dispose();
      this._insertOutput(index, model);
    }
  }

  /**
   * Render and insert a single output into the layout.
   *
   * @param index - The index of the output to be inserted.
   * @param model - The model of the output to be inserted.
   */
  private _insertOutput(index: number, model: IOutputModel): void {
    if (index > this._maxNumberOutputs) {
      return;
    }

    const layout = this.layout as PanelLayout;

    if (index === this._maxNumberOutputs) {
      const warning = new Private.TrimmedOutputs(this._maxNumberOutputs, () => {
        const lastShown = this._maxNumberOutputs;
        this._maxNumberOutputs = Infinity;
        this._showTrimmedOutputs(lastShown);
      });
      layout.insertWidget(index, this._wrappedOutput(warning));
    } else {
      let output = this.createOutputItem(model);
      if (output) {
        output.toggleClass(EXECUTE_CLASS, model.executionCount !== null);
      } else {
        output = new Widget();
      }

      if (!this._outputTracker.has(output)) {
        void this._outputTracker.add(output);
      }
      layout.insertWidget(index, output);
    }
  }

  /**
   * A widget tracker for individual output widgets in the output area.
   */
  get outputTracker(): WidgetTracker<Widget> {
    return this._outputTracker;
  }

  /**
   * Dispose information message and show output models from the given
   * index to maxNumberOutputs
   *
   * @param lastShown Starting model index to insert.
   */
  private _showTrimmedOutputs(lastShown: number) {
    // Dispose information widget
    this.widgets[lastShown].dispose();

    for (let idx = lastShown; idx < this.model.length; idx++) {
      this._insertOutput(idx, this.model.get(idx));
    }

    this.outputLengthChanged.emit(
      Math.min(this.model.length, this._maxNumberOutputs)
    );
  }

  /**
   * Create an output item with a prompt and actual output
   *
   * @returns a rendered widget, or null if we cannot render
   * #### Notes
   */
  protected createOutputItem(model: IOutputModel): Widget | null {
    const output = this.createRenderedMimetype(model);

    if (!output) {
      return null;
    }

    return this._wrappedOutput(output, model.executionCount);
  }

  /**
   * Render a mimetype
   */
  protected createRenderedMimetype(model: IOutputModel): Widget | null {
    const mimeType = this.rendermime.preferredMimeType(
      model.data,
      model.trusted ? 'any' : 'ensure'
    );

    if (!mimeType) {
      return null;
    }
    let output = this.rendermime.createRenderer(mimeType);
    const isolated = OutputArea.isIsolated(mimeType, model.metadata);
    if (isolated === true) {
      output = new Private.IsolatedRenderer(output);
    }
    Private.currentPreferredMimetype.set(output, mimeType);
    output.renderModel(model).catch(error => {
      // Manually append error message to output
      const pre = document.createElement('pre');
      const trans = this._translator.load('jupyterlab');
      pre.textContent = trans.__('Javascript Error: %1', error.message);
      output.node.appendChild(pre);

      // Remove mime-type-specific CSS classes
      output.node.className = 'lm-Widget jp-RenderedText';
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
    const model = this.model;
    const msgType = msg.header.msg_type;
    let output: nbformat.IOutput;
    const transient = ((msg.content as any).transient || {}) as JSONObject;
    const displayId = transient['display_id'] as string;
    let targets: number[] | undefined;
    switch (msgType) {
      case 'execute_result':
      case 'display_data':
      case 'stream':
      case 'error':
        output = { ...msg.content, output_type: msgType };
        model.add(output);
        break;
      case 'clear_output': {
        const wait = (msg as KernelMessage.IClearOutputMsg).content.wait;
        model.clear(wait);
        break;
      }
      case 'update_display_data':
        output = { ...msg.content, output_type: 'display_data' };
        targets = this._displayIdMap.get(displayId);
        if (targets) {
          for (const index of targets) {
            model.set(index, output);
          }
        }
        break;
      case 'status': {
        const executionState = (msg as KernelMessage.IStatusMsg).content
          .execution_state;
        if (executionState === 'idle') {
          // If status is idle, the kernel is no longer blocked by the input
          this._pendingInput = false;
        }
        break;
      }
      default:
        break;
    }
    if (displayId && msgType === 'display_data') {
      targets = this._displayIdMap.get(displayId) || [];
      targets.push(model.length - 1);
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
    const model = this.model;
    const content = msg.content;
    if (content.status !== 'ok') {
      return;
    }
    const payload = content && content.payload;
    if (!payload || !payload.length) {
      return;
    }
    const pages = payload.filter((i: any) => (i as any).source === 'page');
    if (!pages.length) {
      return;
    }
    const page = JSON.parse(JSON.stringify(pages[0]));
    const output: nbformat.IOutput = {
      output_type: 'display_data',
      data: (page as any).data as nbformat.IMimeBundle,
      metadata: {}
    };
    model.add(output);
  };

  /**
   * Wrap a output widget within a output panel
   *
   * @param output Output widget to wrap
   * @param executionCount Execution count
   * @returns The output panel
   */
  private _wrappedOutput(
    output: Widget,
    executionCount: number | null = null
  ): Panel {
    const panel = new Private.OutputPanel();
    panel.addClass(OUTPUT_AREA_ITEM_CLASS);

    const prompt = this.contentFactory.createOutputPrompt();
    prompt.executionCount = executionCount;
    prompt.addClass(OUTPUT_AREA_PROMPT_CLASS);
    panel.addWidget(prompt);

    output.addClass(OUTPUT_AREA_OUTPUT_CLASS);
    panel.addWidget(output);
    return panel;
  }

  private _displayIdMap = new Map<string, number[]>();
  private _future: Kernel.IShellFuture<
    KernelMessage.IExecuteRequestMsg,
    KernelMessage.IExecuteReplyMsg
  >;
  /**
   * The maximum outputs to show in the trimmed
   * output area.
   */
  private _maxNumberOutputs: number;
  private _minHeightTimeout: number | null = null;
  private _inputRequested = new Signal<OutputArea, IStdin>(this);
  private _toggleScrolling = new Signal<OutputArea, void>(this);
  private _initialize = new Signal<OutputArea, void>(this);
  private _outputTracker = new WidgetTracker<Widget>({
    namespace: UUID.uuid4()
  });
  private _translator: ITranslator;
  private _inputHistoryScope: 'global' | 'session' = 'global';
  private _pendingInput: boolean = false;
  private _showInputPlaceholder: boolean = true;
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
  protected createOutputItem(model: IOutputModel): Widget | null {
    const output = this.createRenderedMimetype(model);

    if (!output) {
      return null;
    }

    const panel = new Private.OutputPanel();
    panel.addClass(OUTPUT_AREA_ITEM_CLASS);

    output.addClass(OUTPUT_AREA_OUTPUT_CLASS);
    panel.addWidget(output);
    return panel;
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
    model: IOutputAreaModel;

    /**
     * The content factory used by the widget to create children.
     */
    contentFactory?: IContentFactory;

    /**
     * The rendermime instance used by the widget.
     */
    rendermime: IRenderMimeRegistry;

    /**
     * The maximum number of output items to display on top and bottom of cell output.
     */
    maxNumberOutputs?: number;

    /**
     * Whether to show prompt overlay emitting `toggleScrolling` signal.
     */
    promptOverlay?: boolean;

    /**
     * Translator
     */
    readonly translator?: ITranslator;

    /**
     * Whether to split stdin line history by kernel session or keep globally accessible.
     */
    inputHistoryScope?: 'global' | 'session';

    /**
     * Whether to show placeholder text in standard input
     */
    showInputPlaceholder?: boolean;
  }

  /**
   * Execute code on an output area.
   */
  export async function execute(
    code: string,
    output: OutputArea,
    sessionContext: ISessionContext,
    metadata?: JSONObject
  ): Promise<KernelMessage.IExecuteReplyMsg | undefined> {
    // Override the default for `stop_on_error`.
    let stopOnError = true;
    if (
      metadata &&
      Array.isArray(metadata.tags) &&
      metadata.tags.indexOf('raises-exception') !== -1
    ) {
      stopOnError = false;
    }
    const content: KernelMessage.IExecuteRequestMsg['content'] = {
      code,
      stop_on_error: stopOnError
    };

    const kernel = sessionContext.session?.kernel;
    if (!kernel) {
      throw new Error('Session has no kernel.');
    }
    const future = kernel.requestExecute(content, false, metadata);
    output.future = future;
    return future.done;
  }

  export function isIsolated(
    mimeType: string,
    metadata: ReadonlyPartialJSONObject
  ): boolean {
    const mimeMd = metadata[mimeType] as ReadonlyJSONObject | undefined;
    // mime-specific higher priority
    if (mimeMd && mimeMd['isolated'] !== undefined) {
      return !!mimeMd['isolated'];
    } else {
      // fallback on global
      return !!metadata['isolated'];
    }
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

/** ****************************************************************************
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

/** ****************************************************************************
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
  private static _history: Map<string, string[]> = new Map();

  private static _historyIx(key: string, ix: number): number | undefined {
    const history = Stdin._history.get(key);
    if (!history) {
      return undefined;
    }
    const len = history.length;
    // wrap nonpositive ix to nonnegative ix
    if (ix <= 0) {
      return len + ix;
    }
  }

  private static _historyAt(key: string, ix: number): string | undefined {
    const history = Stdin._history.get(key);
    if (!history) {
      return undefined;
    }
    const len = history.length;
    const ixpos = Stdin._historyIx(key, ix);

    if (ixpos !== undefined && ixpos < len) {
      return history[ixpos];
    }
    // return undefined if ix is out of bounds
  }

  private static _historyPush(key: string, line: string): void {
    const history = Stdin._history.get(key)!;
    history.push(line);
    if (history.length > 1000) {
      // truncate line history if it's too long
      history.shift();
    }
  }

  private static _historySearch(
    key: string,
    pat: string,
    ix: number,
    reverse = true
  ): number | undefined {
    const history = Stdin._history.get(key)!;
    const len = history.length;
    const ixpos = Stdin._historyIx(key, ix);
    const substrFound = (x: string) => x.search(pat) !== -1;

    if (ixpos === undefined) {
      return;
    }

    if (reverse) {
      if (ixpos === 0) {
        // reverse search fails if already at start of history
        return;
      }

      const ixFound = (history.slice(0, ixpos) as any).findLastIndex(
        substrFound
      );
      if (ixFound !== -1) {
        // wrap ix to negative
        return ixFound - len;
      }
    } else {
      if (ixpos >= len - 1) {
        // forward search fails if already at end of history
        return;
      }

      const ixFound = history.slice(ixpos + 1).findIndex(substrFound);
      if (ixFound !== -1) {
        // wrap ix to negative and adjust for slice
        return ixFound - len + ixpos + 1;
      }
    }
  }

  /**
   * Construct a new input widget.
   */
  constructor(options: Stdin.IOptions) {
    super({
      node: Private.createInputWidgetNode(options.prompt, options.password)
    });
    this.addClass(STDIN_CLASS);
    this._future = options.future;
    this._historyIndex = 0;
    this._historyKey =
      options.inputHistoryScope === 'session'
        ? options.parent_header.session
        : '';
    this._historyPat = '';
    this._parentHeader = options.parent_header;
    this._password = options.password;
    this._trans = (options.translator ?? nullTranslator).load('jupyterlab');
    this._value = options.prompt + ' ';

    this._input = this.node.getElementsByTagName('input')[0];
    // make users aware of the line history feature
    if (options.showInputPlaceholder && !this._password) {
      this._input.placeholder = this._trans.__(
        '↑↓ for history. Search history with c-↑/c-↓'
      );
    } else {
      this._input.placeholder = '';
    }

    // initialize line history
    if (!Stdin._history.has(this._historyKey)) {
      Stdin._history.set(this._historyKey, []);
    }
  }

  /**
   * The value of the widget.
   */
  get value(): Promise<string> {
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
  handleEvent(event: KeyboardEvent): void {
    if (this._resolved) {
      // Do not handle any more key events if the promise was resolved.
      event.preventDefault();
      return;
    }
    const input = this._input;

    if (event.type === 'keydown') {
      if (event.key === 'Enter') {
        this.resetSearch();

        this._future.sendInputReply(
          {
            status: 'ok',
            value: input.value
          },
          this._parentHeader
        );
        if (this._password) {
          this._value += '········';
        } else {
          this._value += input.value;
          Stdin._historyPush(this._historyKey, input.value);
        }
        this._resolved = true;
        this._promise.resolve(void 0);
      } else if (event.key === 'Escape') {
        // currently this gets clobbered by the documentsearch:end command at the notebook level
        this.resetSearch();
        input.blur();
      } else if (
        event.ctrlKey &&
        (event.key === 'ArrowUp' || event.key === 'ArrowDown')
      ) {
        // if _historyPat is blank, use input as search pattern. Otherwise, reuse the current search pattern
        if (this._historyPat === '') {
          this._historyPat = input.value;
        }

        const reverse = event.key === 'ArrowUp';
        const searchHistoryIx = Stdin._historySearch(
          this._historyKey,
          this._historyPat,
          this._historyIndex,
          reverse
        );

        if (searchHistoryIx !== undefined) {
          const historyLine = Stdin._historyAt(
            this._historyKey,
            searchHistoryIx
          );
          if (historyLine !== undefined) {
            if (this._historyIndex === 0) {
              this._valueCache = input.value;
            }

            this._setInputValue(historyLine);
            this._historyIndex = searchHistoryIx;
            // The default action for ArrowUp is moving to first character
            // but we want to keep the cursor at the end.
            event.preventDefault();
          }
        }
      } else if (event.key === 'ArrowUp') {
        this.resetSearch();

        const historyLine = Stdin._historyAt(
          this._historyKey,
          this._historyIndex - 1
        );
        if (historyLine) {
          if (this._historyIndex === 0) {
            this._valueCache = input.value;
          }
          this._setInputValue(historyLine);
          --this._historyIndex;
          // The default action for ArrowUp is moving to first character
          // but we want to keep the cursor at the end.
          event.preventDefault();
        }
      } else if (event.key === 'ArrowDown') {
        this.resetSearch();

        if (this._historyIndex === 0) {
          // do nothing
        } else if (this._historyIndex === -1) {
          this._setInputValue(this._valueCache);
          ++this._historyIndex;
        } else {
          const historyLine = Stdin._historyAt(
            this._historyKey,
            this._historyIndex + 1
          );
          if (historyLine) {
            this._setInputValue(historyLine);
            ++this._historyIndex;
          }
        }
      }
    }
  }

  protected resetSearch(): void {
    this._historyPat = '';
  }

  /**
   * Handle `after-attach` messages sent to the widget.
   */
  protected onAfterAttach(msg: Message): void {
    this._input.addEventListener('keydown', this);
    this._input.focus();
  }

  /**
   * Handle `before-detach` messages sent to the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this._input.removeEventListener('keydown', this);
  }

  private _setInputValue(value: string) {
    this._input.value = value;
    // Set cursor at the end; this is usually not necessary when input is
    // focused but having the explicit placement ensures consistency.
    this._input.setSelectionRange(value.length, value.length);
  }

  private _future: Kernel.IShellFuture;
  private _historyIndex: number;
  private _historyKey: string;
  private _historyPat: string;
  private _input: HTMLInputElement;
  private _parentHeader: KernelMessage.IInputReplyMsg['parent_header'];
  private _password: boolean;
  private _promise = new PromiseDelegate<void>();
  private _trans: TranslationBundle;
  private _value: string;
  private _valueCache: string;
  private _resolved: boolean = false;
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

    /**
     * The header of the input_request message.
     */
    parent_header: KernelMessage.IInputReplyMsg['parent_header'];

    /**
     * Translator
     */
    readonly translator?: ITranslator;

    /**
     * Whether to split stdin line history by kernel session or keep globally accessible.
     */
    inputHistoryScope?: 'global' | 'session';

    /**
     * Show placeholder text
     */
    showInputPlaceholder?: boolean;
  }
}

/** ****************************************************************************
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
    const node = document.createElement('div');
    const promptNode = document.createElement('pre');
    promptNode.className = STDIN_PROMPT_CLASS;
    promptNode.textContent = prompt;
    const input = document.createElement('input');
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
  export class IsolatedRenderer
    extends Widget
    implements IRenderMime.IRenderer
  {
    /**
     * Create an isolated renderer.
     */
    constructor(wrapped: IRenderMime.IRenderer) {
      super({ node: document.createElement('iframe') });
      this.addClass('jp-mod-isolated');

      this._wrapped = wrapped;

      // Once the iframe is loaded, the subarea is dynamically inserted
      const iframe = this.node as HTMLIFrameElement & {
        heightChangeObserver: ResizeObserver;
      };

      iframe.frameBorder = '0';
      iframe.scrolling = 'auto';

      iframe.addEventListener('load', () => {
        // Workaround needed by Firefox, to properly render svg inside
        // iframes, see https://stackoverflow.com/questions/10177190/
        // svg-dynamically-added-to-iframe-does-not-render-correctly
        iframe.contentDocument!.open();

        // Insert the subarea into the iframe
        // We must directly write the html. At this point, subarea doesn't
        // contain any user content.
        iframe.contentDocument!.write(this._wrapped.node.innerHTML);

        iframe.contentDocument!.close();

        const body = iframe.contentDocument!.body;

        // Adjust the iframe height automatically
        iframe.style.height = `${body.scrollHeight}px`;
        iframe.heightChangeObserver = new ResizeObserver(() => {
          iframe.style.height = `${body.scrollHeight}px`;
        });
        iframe.heightChangeObserver.observe(body);
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
      return this._wrapped.renderModel(model);
    }

    private _wrapped: IRenderMime.IRenderer;
  }

  export const currentPreferredMimetype = new AttachedProperty<
    IRenderMime.IRenderer,
    string
  >({
    name: 'preferredMimetype',
    create: owner => ''
  });

  /**
   * A `Panel` that's focused by a `contextmenu` event.
   */
  export class OutputPanel extends Panel {
    /**
     * Construct a new `OutputPanel` widget.
     */
    constructor(options?: Panel.IOptions) {
      super(options);
    }

    /**
     * A callback that focuses on the widget.
     */
    private _onContext(_: Event): void {
      this.node.focus();
    }

    /**
     * Handle `after-attach` messages sent to the widget.
     */
    protected onAfterAttach(msg: Message): void {
      super.onAfterAttach(msg);
      this.node.addEventListener('contextmenu', this._onContext.bind(this));
    }

    /**
     * Handle `before-detach` messages sent to the widget.
     */
    protected onBeforeDetach(msg: Message): void {
      super.onAfterDetach(msg);
      this.node.removeEventListener('contextmenu', this._onContext.bind(this));
    }
  }

  /**
   * Trimmed outputs information widget.
   */
  export class TrimmedOutputs extends Widget {
    /**
     * Widget constructor
     *
     * ### Notes
     * The widget will be disposed on click after calling the callback.
     *
     * @param maxNumberOutputs Maximal number of outputs to display
     * @param _onClick Callback on click event on the widget
     */
    constructor(
      maxNumberOutputs: number,
      onClick: (event: MouseEvent) => void
    ) {
      const node = document.createElement('div');
      const title = `The first ${maxNumberOutputs} are displayed`;
      const msg = 'Show more outputs';
      node.insertAdjacentHTML(
        'afterbegin',
        `<a title=${title}>
          <pre>${msg}</pre>
        </a>`
      );
      super({
        node
      });
      this._onClick = onClick;
      this.addClass('jp-TrimmedOutputs');
      this.addClass('jp-RenderedHTMLCommon');
    }

    /**
     * Handle the DOM events for widget.
     *
     * @param event - The DOM event sent to the widget.
     *
     * #### Notes
     * This method implements the DOM `EventListener` interface and is
     * called in response to events on the widget's DOM node. It should
     * not be called directly by user code.
     */
    handleEvent(event: Event): void {
      if (event.type === 'click') {
        this._onClick(event as MouseEvent);
      }
    }

    /**
     * Handle `after-attach` messages for the widget.
     */
    protected onAfterAttach(msg: Message): void {
      super.onAfterAttach(msg);
      this.node.addEventListener('click', this);
    }

    /**
     * A message handler invoked on a `'before-detach'`
     * message
     */
    protected onBeforeDetach(msg: Message): void {
      super.onBeforeDetach(msg);
      this.node.removeEventListener('click', this);
    }

    private _onClick: (event: MouseEvent) => void;
  }
}
