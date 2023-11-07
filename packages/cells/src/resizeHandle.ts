/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { Message } from '@lumino/messaging';
import { Throttler } from '@lumino/polling';
import { Widget } from '@lumino/widgets';
import { Signal } from '@lumino/signaling';

const RESIZE_HANDLE_CLASS = 'jp-CellResizeHandle';

const CELL_RESIZED_CLASS = 'jp-mod-resizedCell';

/**
 * A handle that allows to change input/output proportions in side-by-side mode.
 */
export class ResizeHandle extends Widget {
  constructor(protected targetNode: HTMLElement) {
    super();
    this.addClass(RESIZE_HANDLE_CLASS);
    this._resizer = new Throttler(event => this._resize(event), 50);
  }

  /**
   * Dispose the resizer handle.
   */
  dispose(): void {
    this._resizer.dispose();
    super.dispose();
  }

  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'dblclick':
        this.targetNode.parentNode?.childNodes.forEach(node => {
          (node as HTMLElement).classList.remove(CELL_RESIZED_CLASS);
        });
        document.documentElement.style.setProperty(
          '--jp-side-by-side-output-size',
          `1fr`
        );
        this._isActive = false;
        break;
      case 'mousedown':
        this._isDragging = true;
        if (!this._isActive) {
          this.targetNode.parentNode?.childNodes.forEach(node => {
            (node as HTMLElement).classList.add(CELL_RESIZED_CLASS);
          });

          this._isActive = true;
        }
        window.addEventListener('mousemove', this);
        window.addEventListener('mouseup', this);
        break;
      case 'mousemove': {
        if (this._isActive && this._isDragging) {
          void this._resizer.invoke(event as MouseEvent);
        }
        break;
      }
      case 'mouseup':
        this._isDragging = false;
        window.removeEventListener('mousemove', this);
        window.removeEventListener('mouseup', this);
        break;
      default:
        break;
    }
  }

  /**
   * Handle `after-attach` messages.
   */
  protected onAfterAttach(msg: Message) {
    this.node.addEventListener('dblclick', this);
    this.node.addEventListener('mousedown', this);
    super.onAfterAttach(msg);
  }

  /**
   * Handle `before-detach` messages.
   */
  protected onBeforeDetach(msg: Message) {
    this.node.removeEventListener('dblclick', this);
    this.node.removeEventListener('mousedown', this);
    super.onBeforeDetach(msg);
  }

  private _resize(event: MouseEvent): void {
    // Gate the output size ratio between {0.05, 50} as sensible defaults.
    const { width, x } = this.targetNode.getBoundingClientRect();
    const position = event.clientX - x;
    const ratio = width / position - 1;
    if (0 < ratio) {
      const normalized = Math.max(Math.min(Math.abs(ratio), 50), 0.05);
      document.documentElement.style.setProperty(
        '--jp-side-by-side-output-size',
        `${normalized}fr`
      );
      this.sizeChanged.emit(normalized);
    }
  }

  private _isActive = false;
  private _isDragging = false;
  private _resizer: Throttler<void, void, [MouseEvent]>;

  /**
   * A public signal used to indicate the size of the cell and output has changed.
   */
  readonly sizeChanged = new Signal<this, number>(this);
}
