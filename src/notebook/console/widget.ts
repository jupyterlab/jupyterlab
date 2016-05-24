// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  RenderMime
} from 'jupyter-js-ui/lib/rendermime';

import {
  Message
} from 'phosphor-messaging';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  IObservableList, IListChangedArgs, ListChangeType
} from 'phosphor-observablelist';

import {
  Widget
} from 'phosphor-widget';

import {
  PanelLayout, Panel
} from 'phosphor-panel';

import {
  ICellModel, BaseCellWidget,
  CodeCellWidget, MarkdownCellWidget,
  CodeCellModel, MarkdownCellModel, isMarkdownCellModel,
  RawCellModel, RawCellWidget
} from '../cells';

import {
  IConsoleModel, ITooltipModel
} from './model';

import {
  ConsoleTooltip
} from './tooltip';

import {
  CompletionWidget, ICompletionModel
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

  static createConsole(model: IConsoleModel, rendermime: RenderMime<Widget>): ConsoleWidget {
    return new ConsoleWidget(model, rendermime);
  }

  /**
   * Construct a console panel.
   */
  constructor(model: IConsoleModel, rendermime: RenderMime<Widget>) {
    super();
    this.addClass(CONSOLE_PANEL);
    let constructor = this.constructor as typeof ConsolePanel;
    this._console = constructor.createConsole(model, rendermime);
    this.addChild(this._console);
  }

  get console(): ConsoleWidget {
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
        let prompt = this.console.prompt;
        if (prompt) prompt.input.editor.focus();
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

export
class ConsoleWidget extends Widget {
  /**
   * Create a new cell widget given a cell model.
   */
  static createCell(cell: ICellModel, rendermime: RenderMime<Widget>): BaseCellWidget {
    let widget: BaseCellWidget;
    switch (cell.type) {
    case 'code':
      widget = new CodeCellWidget(cell as CodeCellModel, rendermime);
      break;
    case 'markdown':
      widget = new MarkdownCellWidget(cell as MarkdownCellModel, rendermime);
      break;
    case 'raw':
      widget = new RawCellWidget(cell as RawCellModel);
      break;
    default:
      // If there are any issues, just return a blank placeholder
      // widget so the lists stay in sync.
      widget = new BaseCellWidget(cell);
    }
    return widget;
  }

  /**
   * Create a new completion widget.
   *
   * @param model A completion model instance.
   *
   * @returns A completion widget.
   */
  static createCompletion(model: ICompletionModel): CompletionWidget {
    return new CompletionWidget(model);
  }

  /**
   * Create a new tooltip widget.
   *
   * @param top The top position of the tooltip.
   *
   * @param left The left position of the tooltip.
   *
   * @returns A ConsoleTooltip widget.
   */
  static createTooltip(top: number, left: number): ConsoleTooltip {
    // Null values are automatically set to 'auto'.
    let rect = { top, left, width: null as any, height: null as any };
    return new ConsoleTooltip(rect as ClientRect);
  }

  /*
   * The last cell in a console is always a `CodeCellWidget` prompt.
   */
  get prompt(): CodeCellWidget {
    let layout = (this.layout as PanelLayout);
    let last = layout.childCount() - 1;
    return last > -1 ? layout.childAt(last) as CodeCellWidget : null;
  }

  /**
   * Construct a console widget.
   */
  constructor(model: IConsoleModel, rendermime: RenderMime<Widget>) {
    super();
    let constructor = this.constructor as typeof ConsoleWidget;
    let layout = new PanelLayout();

    this.layout = layout;
    this._model = model;
    this._rendermime = rendermime;

    // Instantiate tab completion widget.
    this._completion = constructor.createCompletion(this._model.completion);
    this._completion.reference = this;
    this._completion.attach(document.body);

    // Instantiate tooltip widget.
    this._tooltip = constructor.createTooltip(0, 0);
    this._tooltip.reference = this;
    this._tooltip.attach(document.body);


    let factory = constructor.createCell;
    for (let i = 0; i < model.cells.length; i++) {
      let cell = factory(model.cells.get(i), this._rendermime);
      layout.addChild(cell);
    }
    let banner = layout.childAt(0);
    banner.addClass(BANNER_CLASS);

    model.cells.changed.connect(this.onCellsChanged, this);
    model.stateChanged.connect(this.onModelChanged, this);

    // Hide the console until banner is set.
    this.addClass(CONSOLE_CLASS);
    this.hide();
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose() {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }

    this._model.dispose()
    this._model = null;

    // Because tooltips are attached to the document body and are not children
    // of the console, they must be disposed manually.
    if (this._tooltip) {
      this._tooltip.dispose();
      this._tooltip = null;
    }

    super.dispose();
  }

  /**
   * Handle `after_attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    let prompt = this.prompt;
    if (prompt) prompt.input.editor.focus();
  }

  /**
   * Handle `update_request` messages.
   */
  protected onUpdateRequest(msg: Message): void {

  }

  /**
   * Handle a change cells event.
   */
  protected onCellsChanged(sender: IObservableList<ICellModel>, args: IListChangedArgs<ICellModel>) {
    let layout = this.layout as PanelLayout;
    let constructor = this.constructor as typeof ConsoleWidget;
    let factory = constructor.createCell;
    let widget: BaseCellWidget;
    switch (args.type) {
    case ListChangeType.Add:
      widget = factory(args.newValue as ICellModel, this._rendermime);
      layout.insertChild(args.newIndex, widget);
      let prompt = this.prompt;
      Private.scrollIfNeeded(this.parent.node, prompt.node);
      prompt.input.editor.focus();
      break;
    }
    this.update();
  }

  /**
   * Handle a model state change event.
   */
  protected onModelChanged(sender: IConsoleModel, args: IChangedArgs<ITooltipModel>) {
    let constructor = this.constructor as typeof ConsoleWidget;
    switch (args.name) {
    case 'tooltip':
      let model = args.newValue;

      if (!model) {
        this._tooltip.hide();
        return;
      }

      let {top, left} = model.change.coords;

      // Offset the height of the tooltip by the height of cursor characters.
      top += model.change.chHeight;
      // Offset the width of the tooltip by the width of cursor characters.
      left -= model.change.chWidth;

      // Account for 1px border on top and bottom.
      let maxHeight = window.innerHeight - top - 2;
      // Account for 1px border on both sides.
      let maxWidth = window.innerWidth - left - 2;

      let content = this._rendermime.render(model.bundle);
      if (!content) {
        console.error('rendermime failed to render', model.bundle);
        return;
      }

      this._tooltip.rect = {top, left} as ClientRect;
      this._tooltip.content = content;
      this._tooltip.node.style.maxHeight = maxHeight + 'px';
      this._tooltip.node.style.maxWidth = maxWidth + 'px';
      if (this._tooltip.isHidden) this._tooltip.show();
      return;
    }
  }

  private _completion: CompletionWidget = null;
  private _model: IConsoleModel = null;
  private _rendermime: RenderMime<Widget> = null;
  private _tooltip: ConsoleTooltip = null;
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
