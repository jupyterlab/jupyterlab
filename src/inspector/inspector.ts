// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Message
} from 'phosphor-messaging';

import {
  Panel
} from 'phosphor-panel';

import {
  ISignal, Signal, clearSignalData
} from 'phosphor-signaling';

import {
  Widget
} from 'phosphor-widget';

import {
  NotebookToolbar, ToolbarButton
} from '../notebook/notebook/toolbar';


/**
 * The class name added to inspector widgets.
 */
const INSPECTOR_CLASS = 'jp-Inspector';

/**
 * The class name added to inspector widgets.
 */
const CHILD_CLASS = 'jp-Inspector-child';

/**
 * The history clear button class name.
 */
const CLEAR_CLASS = 'jp-Inspector-clear';

/**
 * The back button class name.
 */
const BACK_CLASS = 'jp-Inspector-back';

/**
 * The forward button class name.
 */
const FORWARD_CLASS = 'jp-Inspector-forward';

/**
 * The orientation toggle bottom button class name.
 */
const BOTTOM_TOGGLE_CLASS = 'jp-Inspector-bottom';

/**
 * The orientation toggle right button class name.
 */
const RIGHT_TOGGLE_CLASS = 'jp-Inspector-right';


/**
 * An code inspector widget.
 */
export
class Inspector extends Panel {
  /**
   * Construct an inspector widget.
   */
  constructor() {
    super();
    this.addClass(INSPECTOR_CLASS);
    this.update();
  }

  /**
   * The text of the inspector.
   */
  get content(): Widget {
    return this._content;
  }
  set content(newValue: Widget) {
    if (newValue === this._content) {
      return;
    }
    if (this._content) {
      if (this._remember) {
        this._content.hide();
      } else {
        this._content.dispose();
      }
    }
    this._content = newValue;
    if (this._content) {
      this._content.addClass(CHILD_CLASS);
      this.addChild(this._content);
      if (this.remember) {
        this._history.push(newValue);
        this._index++;
      }
    }
  }

  /**
   * The display orientation of the inspector.
   */
  get orientation(): Inspector.Orientation {
    return this._orientation;
  }
  set orientation(newValue: Inspector.Orientation) {
    if (newValue === this._orientation) {
      return;
    }
    this._orientation = newValue;
    this.update();
  }

  /**
   * A signal emitted when an inspector's orientation is toggled.
   */
  get orientationToggled(): ISignal<Inspector, void> {
    return Private.orientationToggledSignal.bind(this);
  }

  /**
   * A flag that indicates whether the inspector remembers history.
   */
  get remember(): boolean {
    return this._remember;
  }
  set remember(newValue: boolean) {
    if (newValue === this._remember) {
      return;
    }
    this._clear();
    this._remember = newValue;
    if (!this.remember) {
      this._history = null;
    }
    this.update();
  }

  /**
   * The display rank of the inspector.
   */
  get rank(): number {
    return this._rank;
  }
  set rank(newValue: number) {
    this._rank = newValue;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    clearSignalData(this);

    if (this._history) {
      this._history.forEach(widget => widget.dispose());
      this._history = null;
    }

    if (this._toolbar) {
      this._toolbar.dispose();
    }

    super.dispose();
  }

  /**
   * Handle `update_request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    if (this._toolbar) {
      this._toolbar.dispose();
    }

    this._toolbar = this._createToolbar();
    this.insertChild(0, this._toolbar);
  }

  /**
   * Navigate back in history.
   */
  private _back(): void {
    if (this._history.length) {
      this._navigateTo(Math.max(this._index - 1, 0));
    }
  }

  /**
   * Clear history.
   */
  private _clear(): void {
    if (this._history) {
      this._history.forEach(widget => widget.dispose());
    }
    this._history = [];
    this._index = -1;
  }

  /**
   * Navigate forward in history.
   */
  private _forward(): void {
    if (this._history.length) {
      this._navigateTo(Math.min(this._index + 1, this._history.length - 1));
    }
  }

  /**
   * Create a history toolbar.
   */
  private _createToolbar(): NotebookToolbar {
    let toolbar = new NotebookToolbar();

    let toggle = new ToolbarButton({
      className: this.orientation === 'vertical' ? RIGHT_TOGGLE_CLASS
        : BOTTOM_TOGGLE_CLASS,
      onClick: () => this.orientationToggled.emit(void 0),
      tooltip: 'Toggle the inspector orientation.'
    });
    toolbar.add('toggle', toggle);

    if (!this._remember) {
      return toolbar;
    }

    let clear = new ToolbarButton({
      className: CLEAR_CLASS,
      onClick: () => this._clear(),
      tooltip: 'Clear history.'
    });
    toolbar.add('clear', clear);

    let back = new ToolbarButton({
      className: BACK_CLASS,
      onClick: () => this._back(),
      tooltip: 'Navigate back in history.'
    });
    toolbar.add('back', back);

    let forward = new ToolbarButton({
      className: FORWARD_CLASS,
      onClick: () => this._forward(),
      tooltip: 'Navigate forward in history.'
    });
    toolbar.add('forward', forward);

    return toolbar;
  }

  /**
   * Navigate to a known index in history.
   */
  private _navigateTo(index: number): void {
    if (this._content) {
      this._content.hide();
    }
    this._content = this._history[index];
    this._index = index;
    this._content.show();
  }

  private _content: Widget = null;
  private _history: Widget[] = null;
  private _index: number = -1;
  private _orientation: Inspector.Orientation = 'horizontal';
  private _rank: number = Infinity;
  private _remember: boolean = false;
  private _toolbar: NotebookToolbar = null;
}


/**
 * A namespace for inspector private data.
 */
namespace Private {
  /**
   * A signal emitted when an inspector's orientation is toggled.
   */
  export
  const orientationToggledSignal = new Signal<Inspector, void>();

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

  /**
   * Jump to the bottom of a node.
   *
   * @param node - The scrollable element.
   */
  export
  function scrollToBottom(node: HTMLElement): void {
    node.scrollTop = node.scrollHeight;
  }
}


/**
 * A namespace for Inspector statics.
 */
export
namespace Inspector {
  /**
   * The orientation options of am inspector.
   */
  export
  type Orientation = 'horizontal' | 'vertical';

  /**
   * An update value for code inspectors.
   */
  export
  interface IInspectorUpdate {
    /**
     * The content being sent to the inspector for display.
     */
    content: Widget;

    /**
     * The type of the inspector being updated.
     */
    type: string;
  }
}
