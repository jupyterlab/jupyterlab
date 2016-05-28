// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IKernel, INotebookSession
} from 'jupyter-js-services';

import {
  RenderMime
} from 'jupyter-js-ui/lib/rendermime';

import {
  Message
} from 'phosphor-messaging';

import {
  clearSignalData
} from 'phosphor-signaling';

import {
  Widget
} from 'phosphor-widget';

import {
  PanelLayout, Panel
} from 'phosphor-panel';

import {
  CodeCellWidget, CodeCellModel, RawCellModel, RawCellWidget
} from '../cells';

import {
  EdgeLocation, CellEditorWidget
} from '../cells/editor';

import {
  mimetypeForLangauge
} from '../common/mimetype';

import {
  ConsoleTooltip
} from './tooltip';

import {
  ConsoleHistory
} from './history';

import {
  CompletionWidget
} from '../completion';


/**
 * The class name added to console widgets.
 */
const CONSOLE_CLASS = 'jp-Console';

/**
 * The class name added to console panels.
 */
const CONSOLE_PANEL = 'jp-Console-panel';

/**
 * The class name added to the console banner.
 */
const BANNER_CLASS = 'jp-Console-banner';


/**
 * A panel which contains a toolbar and a console.
 */
export
class ConsolePanel extends Panel {
  /**
   * Create a new console widget for the panel.
   */
  static createConsole(session: INotebookSession, rendermime: RenderMime<Widget>): ConsoleWidget {
    return new ConsoleWidget(session, rendermime);
  }

  /**
   * Construct a console panel.
   */
  constructor(session: INotebookSession, rendermime: RenderMime<Widget>) {
    super();
    this.addClass(CONSOLE_PANEL);
    let constructor = this.constructor as typeof ConsolePanel;
    this._console = constructor.createConsole(session, rendermime);
    this.addChild(this._console);
  }

  /**
   * The console widget used by the panel.
   *
   * #### Notes
   * This is a read-only property.
   */
  get content(): ConsoleWidget {
    return this._console;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this._console = null;
    super.dispose();
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
    switch (event.type) {
    case 'click':
      let prompt = this.content.prompt;
      if (prompt) {
        prompt.focus();
      }
      break;
    default:
      break;
    }
  }

  /**
   * Handle `after_attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    this.node.addEventListener('click', this);
  }

  /**
   * Handle `before_detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('click', this);
  }

  private _console: ConsoleWidget = null;
}


/**
 * A widget containing a Jupyter console.
 */
export
class ConsoleWidget extends Widget {
  /**
   * Create a new banner widget given a banner model.
   */
  static createBanner() {
    let model = new RawCellModel();
    return new RawCellWidget(model);
  }

  /**
   * Create a new prompt widget given a prompt model and a rendermime.
   */
  static createPrompt(rendermime: RenderMime<Widget>): CodeCellWidget {
    let model = new CodeCellModel();
    return new CodeCellWidget(model, rendermime);
  }

  /**
   * Create a new completion widget.
   */
  static createCompletion(): CompletionWidget {
    return new CompletionWidget();
  }

  /**
   * Create a console history.
   */
  static createHistory(kernel: IKernel): ConsoleHistory {
    return new ConsoleHistory(kernel);
  }

  /**
   * Create a new tooltip widget.
   *
   * @returns A ConsoleTooltip widget.
   */
  static createTooltip(rendermime: RenderMime<Widget>): ConsoleTooltip {
    return new ConsoleTooltip(rendermime);
  }

  /**
   * Construct a console widget.
   */
  constructor(session: INotebookSession, rendermime: RenderMime<Widget>) {
    super();
    this.addClass(CONSOLE_CLASS);

    let constructor = this.constructor as typeof ConsoleWidget;
    let layout = new PanelLayout();

    this.layout = layout;
    this._rendermime = rendermime;
    this._session = session;

    this._history = constructor.createHistory(session.kernel);

    // Instantiate tab completion widget.
    this._completion = constructor.createCompletion();
    this._completion.kernel = session.kernel;
    this._completion.attach(document.body);

    // Instantiate tooltip widget.
    this._tooltip = constructor.createTooltip(this._rendermime);
    this._tooltip.kernel = session.kernel;
    this._tooltip.attach(document.body);

    // Create the banner.
    let banner = constructor.createBanner();
    banner.addClass(BANNER_CLASS);
    banner.readOnly = true;
    layout.addChild(banner);

    // Set the banner text and the mimetype.
    this.initialize();

    // Create the prompt.
    this.newPrompt();

    // Handle changes to the session.
    session.kernelChanged.connect((s, kernel) => {
      this.clear();
      this.newPrompt();
      this.initialize();
      this._history = constructor.createHistory(kernel);
      this._completion.kernel = kernel;
      this._tooltip.kernel = kernel;
    });
  }

  /*
   * The last cell in a console is always a `CodeCellWidget` prompt.
   */
  get prompt(): CodeCellWidget {
    let layout = this.layout as PanelLayout;
    let last = layout.childCount() - 1;
    return last > -1 ? layout.childAt(last) as CodeCellWidget : null;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose() {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    this._tooltip.dispose();
    this._tooltip = null;
    this._history.dispose();
    this._history = null;
    this._completion.dispose();
    this._completion = null;
    super.dispose();
  }

  /**
   * Execute the current prompt.
   */
  execute(): Promise<void> {
    let prompt = this.prompt;
    prompt.trusted = true;
    this._history.push(prompt.model.source);
    return prompt.execute(this._session.kernel).then(
      () => this.newPrompt(),
      () => this.newPrompt()
    );
  }

  /**
   * Clear the code cells.
   */
  clear(): void {
    let layout = this.layout as PanelLayout;
    for (let i = 0; i < layout.childCount() - 2; i++) {
      let cell = layout.childAt(1) as CodeCellWidget;
      cell.dispose();
    }
    this.newPrompt();
  }

  /**
   * Handle `after_attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    let prompt = this.prompt;
    if (prompt) {
      prompt.focus();
    }
  }

  /**
   * Handle `update_request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    let prompt = this.prompt;
    Private.scrollIfNeeded(this.parent.node, prompt.node);
    prompt.focus();
  }

  /**
   * Make a new prompt.
   */
  protected newPrompt(): void {
    // Make the previous editor read-only and clear its signals.
    let prompt = this.prompt;
    if (prompt) {
      prompt.readOnly = true;
      clearSignalData(prompt);
    }

    // Create the new prompt and add to layout.
    let layout = this.layout as PanelLayout;
    let constructor = this.constructor as typeof ConsoleWidget;
    prompt = constructor.createPrompt(this._rendermime);
    prompt.mimetype = this._mimetype;
    layout.addChild(prompt);

    // Hook up completion, tooltip, and history handling.
    let editor = prompt.editor;
    this._completion.editor = editor;
    this._tooltip.editor = editor;
    editor.edgeRequested.connect(this.onEdgeRequest, this);
  }

  /**
   * Initialize the banner and mimetype.
   */
  protected initialize(): void {
    let layout = this.layout as PanelLayout;
    let banner = layout.childAt(0) as RawCellWidget;
    this._session.kernel.kernelInfo().then(info => {
      banner.model.source = info.banner;
      this._mimetype = mimetypeForLangauge(info.language_info);
      this.prompt.mimetype = this._mimetype;
    });
  }

  /**
   * Handle an edge requested signal.
   */
  protected onEdgeRequest(editor: CellEditorWidget, location: EdgeLocation): void {
    let doc = editor.editor.getDoc();
    if (location === 'top') {
      this._history.back().then(value => {
        if (!value) {
          return;
        }
        doc.setValue(value);
        doc.setCursor(doc.posFromIndex(0));
      });
    } else {
      this._history.forward().then(value => {
        // If at the bottom end of history, then clear the prompt.
        let text = value || '';
        doc.setValue(text);
        doc.setCursor(doc.posFromIndex(text.length));
      });
    }
  }

  private _completion: CompletionWidget = null;
  private _mimetype = 'text/x-ipython';
  private _rendermime: RenderMime<Widget> = null;
  private _tooltip: ConsoleTooltip = null;
  private _history: ConsoleHistory = null;
  private _session: INotebookSession = null;
}


/**
 * A namespace for Console widget private data.
 */
namespace Private {
  /**
   * Scroll an element into view if needed.
   *
   * @param area - The scroll area element.
   *
   * @param elem - The element of interest.
   */
  export
  function scrollIfNeeded(area: HTMLElement, elem: HTMLElement): void {
    let ar = area.getBoundingClientRect();
    let er = elem.getBoundingClientRect();
    if (er.top < ar.top - 10) {
      area.scrollTop -= ar.top - er.top + 10;
    } else if (er.bottom > ar.bottom + 10) {
      area.scrollTop += er.bottom - ar.bottom + 10;
    }
  }
}
