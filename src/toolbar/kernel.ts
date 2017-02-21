// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel
} from '@jupyterlab/services';

import {
  ISignal
} from '@phosphor/signaling';

import {
  Widget
} from '@phosphor/widgetwidget';

import {
  restartKernel
} from '../docregistry';

import {
  ToolbarButton
} from './index';

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
 * A kernel owner interface.
 */
export
interface IKernelOwner {
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
  return new KernelName(kernelOwner);
}


/**
 * A kernel name widget.
 */
class KernelName extends Widget {
  /**
   * Construct a new kernel name widget.
   */
  constructor(kernelOwner: IKernelOwner) {
    super();
    this.addClass(TOOLBAR_KERNEL_CLASS);
    this._onKernelChanged(kernelOwner, kernelOwner.kernel);
    kernelOwner.kernelChanged.connect(this._onKernelChanged, this);
  }

  /**
   * Update the text of the kernel name item.
   */
  _onKernelChanged(sender: IKernelOwner, kernel: Kernel.IKernel): void {
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
    this._onKernelChanged(kernelOwner, kernelOwner.kernel);
    kernelOwner.kernelChanged.connect(this._onKernelChanged, this);
  }

  /**
   * Handle a change in kernel.
   */
  private _onKernelChanged(sender: IKernelOwner, kernel: Kernel.IKernel): void {
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
