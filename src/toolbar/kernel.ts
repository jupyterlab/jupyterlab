// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel, Kernel
} from '@jupyterlab/services';

import {
  ISignal
} from 'phosphor/lib/core/signaling';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  restartKernel
} from '../docregistry';

import {
  ToolbarButton
} from './index';

/**
 * The class name added to toolbar interrupt button.
 */
const TOOLBAR_INTERRUPT_CLASS = 'jp-Kernel-toolbarInterrupt';

/**
 * The class name added to toolbar restart button.
 */
const TOOLBAR_RESTART_CLASS = 'jp-Kernel-toolbarRestart';

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
 * A kernel owner interface.
 */
export
interface IKernelOwner {
  /**
   * An associated kernel.
   */
  kernel: IKernel;
  /**
   * A signal emitted when the kernel is changed.
   */
  kernelChanged: ISignal<IKernelOwner, IKernel>;
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
function createRestartButton(kernelOwner: IKernelOwner, host?: HTMLElement): ToolbarButton {
  return new ToolbarButton({
    className: TOOLBAR_RESTART_CLASS,
    onClick: () => {
      restartKernel(kernelOwner.kernel, host);
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
  let widget = new Widget();
  widget.addClass(TOOLBAR_KERNEL_CLASS);
  updateKernelNameItem(widget, kernelOwner.kernel);
  kernelOwner.kernelChanged.connect(() => {
    updateKernelNameItem(widget, kernelOwner.kernel);
  });
  return widget;
}


/**
 * Update the text of the kernel name item.
 */
function updateKernelNameItem(widget: Widget, kernel: IKernel): void {
  widget.node.textContent = 'No Kernel!';
  if (!kernel) {
    return;
  }
  if (kernel.spec) {
    widget.node.textContent = kernel.spec.display_name;
  } else {
    kernel.getSpec().then(spec => {
      if (!widget.isDisposed) {
        widget.node.textContent = kernel.spec.display_name;
      }
    });
  }
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
  return new KernelIndicator(kernelOwner);
}


/**
 * A toolbar item that displays kernel status.
 */
class KernelIndicator extends Widget {
  /**
   * Construct a new kernel status widget.
   */
  constructor(kernelOwner: IKernelOwner) {
    super();
    this.addClass(TOOLBAR_INDICATOR_CLASS);
    if (kernelOwner.kernel) {
      this._handleStatus(kernelOwner.kernel, kernelOwner.kernel.status);
      kernelOwner.kernel.statusChanged.connect(this._handleStatus, this);
    } else {
      this.addClass(TOOLBAR_BUSY_CLASS);
      this.node.title = 'No Kernel!';
    }
    kernelOwner.kernelChanged.connect((c, kernel) => {
      if (kernel) {
        this._handleStatus(kernel, kernel.status);
        kernel.statusChanged.connect(this._handleStatus, this);
      } else {
        this.node.title = 'No Kernel!';
        this.addClass(TOOLBAR_BUSY_CLASS);
      }
    });
  }

  /**
   * Handle a status on a kernel.
   */
  private _handleStatus(kernel: IKernel, status: Kernel.Status) {
    if (this.isDisposed) {
      return;
    }
    this.toggleClass(TOOLBAR_BUSY_CLASS, status !== 'idle');
    let title = 'Kernel ' + status[0].toUpperCase() + status.slice(1);
    this.node.title = title;
  }
}
