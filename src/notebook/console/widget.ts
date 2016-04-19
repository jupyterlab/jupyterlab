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
  IConsoleModel
} from './model';


/**
 * The class name added to console widgets.
 */
const CONSOLE_CLASS = 'jp-Console';

/**
 * The class name added to console panels.
 */
const CONSOLE_PANEL = 'jp-Console-panel';

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
   * Construct a console widget.
   */
  constructor(model: IConsoleModel, rendermime: RenderMime<Widget>) {
    super();
    this.addClass(CONSOLE_CLASS);
    this._model = model;
    this._rendermime = rendermime;
    this.layout = new PanelLayout();
    this._initHeader();
    model.cells.changed.connect(this.onCellsChanged, this);
    model.stateChanged.connect(this.onModelChanged, this);
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose() {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
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
  }

  /**
   * Handle `after_attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    this._prompt.input.editor.focus();
  }

  /**
   * Handle `before_detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
  }

  /**
   * Handle `update-request` messages sent to the widget.
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
      // widget.addClass(NB_CELL_CLASS);
      // widget.input.editor.addClass(NB_EDITOR_CLASS);
      layout.insertChild(args.newIndex, widget);
      break;
    }
    this.update();
  }

  /**
   * Handle changes to the notebook model.
   */
  protected onModelChanged(model: IConsoleModel, args: IChangedArgs<any>): void {
    switch (args.name) {
    case 'banner':
      this._updateBanner();
      break;
    }
  }

  private _initHeader(): void {
    let constructor = this.constructor as typeof ConsoleWidget;
    let cellsLayout = this.layout as PanelLayout;
    let factory = constructor.createCell;
    for (let i = 0; i < this._model.cells.length; i++) {
      cellsLayout.addChild(factory(this._model.cells.get(i), this._rendermime));
    }
    let last = cellsLayout.childCount() - 1;
    this._banner = cellsLayout.childAt(0) as RawCellWidget;
    this._prompt = cellsLayout.childAt(last) as CodeCellWidget;
    this._updateBanner();
  }

  /**
   * Update the console banner.
   */
  private _updateBanner(): void {
    let model = this._model;
    let bannerModel = (this._banner.model as RawCellModel);
    bannerModel.input.textEditor.text = model.banner;
  }

  private _banner: RawCellWidget = null;
  private _model: IConsoleModel;
  private _prompt: CodeCellWidget = null;
  private _rendermime: RenderMime<Widget> = null;
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
