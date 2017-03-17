// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel
} from '@jupyterlab/services';

import {
  IIterator, find, map
} from '@phosphor/algorithm';

import {
  Message
} from '@phosphor/messaging';

import {
  AttachedProperty
} from '@phosphor/properties';

import {
  ISignal
} from '@phosphor/signaling';

import {
  PanelLayout, Widget
} from '@phosphor/widgets';

import {
  restartKernel
} from './restartkernel';


/**
 * The class name added to toolbars.
 */
const TOOLBAR_CLASS = 'jp-Toolbar';

/**
 * The class name added to toolbar items.
 */
const TOOLBAR_ITEM_CLASS = 'jp-Toolbar-item';

/**
 * The class name added to toolbar buttons.
 */
const TOOLBAR_BUTTON_CLASS = 'jp-Toolbar-button';

/**
 * The class name added to a pressed button.
 */
const TOOLBAR_PRESSED_CLASS = 'jp-mod-pressed';

/**
 * The class name added to toolbar interrupt button.
 */
const TOOLBAR_INTERRUPT_CLASS = 'jp-StopIcon';

/**
 * The class name added to toolbar restart button.
 */
const TOOLBAR_RESTART_CLASS = 'jp-RefreshIcon';

/**
 * The class name added to toolbar kernel name text.
 */
const TOOLBAR_KERNEL_CLASS = 'jp-Kernel-toolbarKernelName';

/**
 * The class name added to toolbar kernel indicator icon.
 */
const TOOLBAR_INDICATOR_CLASS = 'jp-Kernel-toolbarKernelIndicator';

/**
 * The class name added to a busy kernel indicator.
 */
const TOOLBAR_BUSY_CLASS = 'jp-mod-busy';



/**
 * A class which provides a toolbar widget.
 */
export
class Toolbar<T extends Widget> extends Widget {
  /**
   * Construct a new toolbar widget.
   */
  constructor() {
    super();
    this.addClass(TOOLBAR_CLASS);
    this.layout = new PanelLayout();
  }

  /**
   * Get an iterator over the ordered toolbar item names.
   *
   * @returns An iterator over the toolbar item names.
   */
  names(): IIterator<string> {
    let layout = this.layout as PanelLayout;
    return map(layout.widgets, widget => {
      return Private.nameProperty.get(widget);
    });
  }

  /**
   * Add an item to the end of the toolbar.
   *
   * @param name - The name of the widget to add to the toolbar.
   *
   * @param widget - The widget to add to the toolbar.
   *
   * @param index - The optional name of the item to insert after.
   *
   * @returns Whether the item was added to toolbar.  Returns false if
   *   an item of the same name is already in the toolbar.
   */
  addItem(name: string, widget: T): boolean {
    let layout = this.layout as PanelLayout;
    return this.insertItem(layout.widgets.length, name, widget);
  }

  /**
   * Insert an item into the toolbar at the specified index.
   *
   * @param index - The index at which to insert the item.
   *
   * @param name - The name of the item.
   *
   * @param widget - The widget to add.
   *
   * @returns Whether the item was added to the toolbar. Returns false if
   *   an item of the same name is already in the toolbar.
   *
   * #### Notes
   * The index will be clamped to the bounds of the items.
   */
  insertItem(index: number, name: string, widget: T): boolean {
    let existing = find(this.names(), value => value === name);
    if (existing) {
      return false;
    }
    widget.addClass(TOOLBAR_ITEM_CLASS);
    let layout = this.layout as PanelLayout;
    layout.insertWidget(index, widget);
    Private.nameProperty.set(widget, name);
    return true;
  }

  /**
   * Remove an item in the toolbar by value.
   *
   *  @param name - The name of the widget to remove from the toolbar.
   */
  removeItem(widget: T): void {
    let layout = this.layout as PanelLayout;
    layout.removeWidget(widget);
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
      if (!this.node.contains(document.activeElement)) {
        this.parent.activate();
      }
      break;
    default:
      break;
    }
  }

  /**
   * Handle `after-attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    this.node.addEventListener('click', this);
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('click', this);
  }
}


/**
 * The namespace for Toolbar class statics.
 */
export
namespace Toolbar {
  /**
   * A kernel owner interface.
   */
  export
  interface IKernelOwner extends Widget {
    /**
     * An associated kernel.
     */
    kernel: Kernel.IKernel;
    /**
     * A signal emitted when the kernel is changed.
     */
    kernelChanged: ISignal<IKernelOwner, Kernel.IKernel>;
  }

  /**
   * Create an interrupt toolbar item.
   */
  export
  function createInterruptButton(kernelOwner: IKernelOwner): ToolbarButton {
    return new ToolbarButton({
      className: TOOLBAR_INTERRUPT_CLASS,
      onClick: () => {
        if (kernelOwner.kernel) {
          kernelOwner.kernel.interrupt();
        }
      },
      tooltip: 'Interrupt the kernel'
    });
  }


  /**
   * Create a restart toolbar item.
   */
  export
  function createRestartButton(kernelOwner: IKernelOwner): ToolbarButton {
    return new ToolbarButton({
      className: TOOLBAR_RESTART_CLASS,
      onClick: () => {
        if (!kernelOwner.kernel) {
          return;
        }
        restartKernel(kernelOwner.kernel, kernelOwner);
      },
      tooltip: 'Restart the kernel'
    });
  }


  /**
   * Create a kernel name indicator item.
   *
   * #### Notes
   * It will display the `'display_name`' of the current kernel,
   * or `'No Kernel!'` if there is no kernel.
   * It can handle a change in context or kernel.
   */
  export
  function createKernelNameItem(kernelOwner: IKernelOwner): Widget {
    return new Private.KernelName(kernelOwner);
  }


  /**
   * Create a kernel status indicator item.
   *
   * #### Notes
   * It show display a busy status if the kernel status is
   * not idle.
   * It will show the current status in the node title.
   * It can handle a change to the context or the kernel.
   */
  export
  function createKernelStatusItem(kernelOwner: IKernelOwner): Widget {
    return new Private.KernelIndicator(kernelOwner);
  }
}


/**
 * A widget which acts as a button in a toolbar.
 */
export
class ToolbarButton extends Widget {
  /**
   * Construct a new toolbar button.
   */
  constructor(options: ToolbarButton.IOptions = {}) {
    super({ node: document.createElement('span') });
    options = options || {};
    this.addClass(TOOLBAR_BUTTON_CLASS);
    this._onClick = options.onClick;
    if (options.className) {
      this.addClass(options.className);
    }
    this.node.title = options.tooltip || '';
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this._onClick = null;
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
      if (this._onClick) {
        this._onClick();
      }
      break;
    case 'mousedown':
      this.addClass(TOOLBAR_PRESSED_CLASS);
      break;
    case 'mouseup':
    case 'mouseout':
      this.removeClass(TOOLBAR_PRESSED_CLASS);
      break;
    default:
      break;
    }
  }

  /**
   * Handle `after-attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    this.node.addEventListener('click', this);
    this.node.addEventListener('mousedown', this);
    this.node.addEventListener('mouseup', this);
    this.node.addEventListener('mouseout', this);
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('click', this);
    this.node.removeEventListener('mousedown', this);
    this.node.removeEventListener('mouseup', this);
    this.node.removeEventListener('mouseout', this);
  }

  private _onClick: () => void;
}


/**
 * A namespace for `ToolbarButton` statics.
 */
export
namespace ToolbarButton {
  /**
   * The options used to construct a toolbar button.
   */
  export
  interface IOptions {
    /**
     * The callback for a click event.
     */
    onClick?: () => void;

    /**
     * The class name added to the button.
     */
    className?: string;

    /**
     * The tooltip added to the button node.
     */
    tooltip?: string;
  }
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * An attached property for the name of a toolbar item.
   */
  export
  const nameProperty = new AttachedProperty<Widget, string>({
    name: 'name',
    create: () => ''
  });

  /**
   * A kernel name widget.
   */
  export
  class KernelName extends Widget {
    /**
     * Construct a new kernel name widget.
     */
    constructor(kernelOwner: Toolbar.IKernelOwner) {
      super();
      this.addClass(TOOLBAR_KERNEL_CLASS);
      this._onKernelChanged(kernelOwner, kernelOwner.kernel);
      kernelOwner.kernelChanged.connect(this._onKernelChanged, this);
    }

    /**
     * Update the text of the kernel name item.
     */
    _onKernelChanged(sender: Toolbar.IKernelOwner, kernel: Kernel.IKernel): void {
      this.node.textContent = 'No Kernel!';
      if (!kernel) {
        return;
      }
      kernel.getSpec().then(spec => {
        if (!this.isDisposed) {
          this.node.textContent = spec.display_name;
        }
      });
    }
  }

  /**
   * A toolbar item that displays kernel status.
   */
  export
  class KernelIndicator extends Widget {
    /**
     * Construct a new kernel status widget.
     */
    constructor(kernelOwner: Toolbar.IKernelOwner) {
      super();
      this.addClass(TOOLBAR_INDICATOR_CLASS);
      this._onKernelChanged(kernelOwner, kernelOwner.kernel);
      kernelOwner.kernelChanged.connect(this._onKernelChanged, this);
    }

    /**
     * Handle a change in kernel.
     */
    private _onKernelChanged(sender: Toolbar.IKernelOwner, kernel: Kernel.IKernel): void {
      if (this._kernel) {
        this._kernel.statusChanged.disconnect(this._handleStatus, this);
      }
      this._kernel = kernel;
      if (kernel) {
        this._handleStatus(kernel, kernel.status);
        kernel.statusChanged.connect(this._handleStatus, this);
      } else {
        this.node.title = 'No Kernel!';
        this.addClass(TOOLBAR_BUSY_CLASS);
      }
    }

    /**
     * Handle a status on a kernel.
     */
    private _handleStatus(kernel: Kernel.IKernel, status: Kernel.Status) {
      if (this.isDisposed) {
        return;
      }
      this.toggleClass(TOOLBAR_BUSY_CLASS, status !== 'idle');
      let title = 'Kernel ' + status[0].toUpperCase() + status.slice(1);
      this.node.title = title;
    }

    private _kernel: Kernel.IKernel = null;
  }
}
