// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import type { IDisposable } from '@lumino/disposable';
import type { ISignal } from '@lumino/signaling';
import { Signal } from '@lumino/signaling';
import type { AccordionPanel, Widget } from '@lumino/widgets';

/**
 * Opt-in drag reordering shared by sidebar accordion panels.
 */
export class AccordionPanelReorderer
  implements IDisposable, EventListenerObject
{
  /**
   * Get or create the reorderer for a panel.
   */
  static get(
    panel: AccordionPanel,
    translator: ITranslator = nullTranslator
  ): AccordionPanelReorderer {
    let reorderer = this._instances.get(panel.node);
    if (!reorderer) {
      reorderer = new AccordionPanelReorderer(panel, translator);
      this._instances.set(panel.node, reorderer);
    }
    return reorderer;
  }

  /**
   * Find the reorderer associated with an accordion node.
   */
  static find(node: HTMLElement): AccordionPanelReorderer | undefined {
    return this._instances.get(node);
  }

  private constructor(
    private _panel: AccordionPanel,
    translator: ITranslator
  ) {
    this._trans = translator.load('jupyterlab');
    this._indicator.className = 'jp-AccordionPanel-dropIndicator';
    this._indicator.style.display = 'none';
    _panel.node.appendChild(this._indicator);
    this._updateHandles();
    this._observer = new MutationObserver(() => this._updateHandles());
    this._observer.observe(_panel.node, { childList: true });
    for (const type of [
      'pointerdown',
      'pointermove',
      'pointerup',
      'pointercancel',
      'lostpointercapture'
    ]) {
      _panel.node.addEventListener(type, this);
    }
    _panel.disposed.connect(this.dispose, this);
  }

  /**
   * Whether drag handles are visible and reordering is enabled.
   */
  get enabled(): boolean {
    return this._panel.hasClass('jp-mod-reorderable');
  }
  set enabled(value: boolean) {
    this._panel.toggleClass('jp-mod-reorderable', value);
    if (!value) {
      this._endDrag();
    }
    this._updateHandles();
  }

  /**
   * A signal emitted after a section is reordered.
   */
  get reordered(): ISignal<this, Widget> {
    return this._reordered;
  }

  /**
   * Whether the reorderer has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Remove event listeners and drag controls.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this.enabled = false;
    this._observer.disconnect();
    for (const type of [
      'pointerdown',
      'pointermove',
      'pointerup',
      'pointercancel',
      'lostpointercapture'
    ]) {
      this._panel.node.removeEventListener(type, this);
    }
    this._panel.node
      .querySelectorAll('.jp-AccordionPanel-dragHandle')
      .forEach(handle => handle.remove());
    this._indicator.remove();
    AccordionPanelReorderer._instances.delete(this._panel.node);
    Signal.clearData(this);
  }

  /**
   * Handle pointer events from the panel's drag handles.
   */
  handleEvent(event: Event): void {
    if (event.type === 'keydown') {
      if (this._draggedWidget && (event as KeyboardEvent).key === 'Escape') {
        this._endDrag();
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
    const pointer = event as PointerEvent;
    if (event.type === 'pointerdown') {
      const target = event.target;
      if (
        !this.enabled ||
        this._pointerId !== null ||
        pointer.button !== 0 ||
        !(target instanceof HTMLElement) ||
        !target.closest('.jp-AccordionPanel-dragHandle')
      ) {
        return;
      }
      const title = target.closest('.lm-AccordionPanel-title');
      const index = this._panel.titles.findIndex(node => node === title);
      if (index < 0) {
        return;
      }
      this._draggedWidget = this._panel.widgets[index];
      this._start = this._coordinate(pointer);
      this._pointerId = pointer.pointerId;
      this._panel.node.setPointerCapture(pointer.pointerId);
      this._panel.node.ownerDocument.addEventListener('keydown', this, true);
      event.preventDefault();
    } else if (pointer.pointerId === this._pointerId) {
      switch (event.type) {
        case 'pointermove': {
          const position = this._coordinate(pointer);
          if (Math.abs(position - this._start) > 5) {
            this._isDragging = true;
            this._panel.addClass('jp-mod-dragging');
          }
          if (this._isDragging) {
            this._showIndicator(this._getTargetSlot(position));
          }
          break;
        }
        case 'pointerup':
          this._endDrag(this._coordinate(pointer));
          break;
        case 'pointercancel':
        case 'lostpointercapture':
          this._endDrag();
          break;
      }
    }
  }

  private _updateHandles(): void {
    for (const title of this._panel.titles) {
      if (!title.querySelector('.jp-AccordionPanel-dragHandle')) {
        const handle = document.createElement('span');
        handle.className = 'jp-AccordionPanel-dragHandle';
        handle.setAttribute('aria-hidden', 'true');
        handle.title = this._trans.__('Drag to reorder');
        title.prepend(handle);
      }
    }
  }

  private _coordinate(event: PointerEvent): number {
    return this._panel.orientation === 'horizontal'
      ? event.clientX
      : event.clientY;
  }

  private _getTargetSlot(position: number): number {
    const horizontal = this._panel.orientation === 'horizontal';
    const slot = this._panel.titles.findIndex(title => {
      const rect = title.getBoundingClientRect();
      return (
        position <
        (horizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2)
      );
    });
    return slot < 0 ? this._panel.titles.length : slot;
  }

  private _showIndicator(slot: number): void {
    const titles = this._panel.titles;
    if (!titles.length) {
      return;
    }
    const horizontal = this._panel.orientation === 'horizontal';
    const rect = (
      titles[slot] ?? titles[titles.length - 1]
    ).getBoundingClientRect();
    const panelRect = this._panel.node.getBoundingClientRect();
    const edge = horizontal
      ? slot < titles.length
        ? rect.left
        : rect.right
      : slot < titles.length
        ? rect.top
        : rect.bottom;
    this._indicator.style.left = horizontal ? `${edge - panelRect.left}px` : '';
    this._indicator.style.top = horizontal ? '' : `${edge - panelRect.top}px`;
    this._indicator.style.display = 'block';
  }

  private _endDrag(position?: number): void {
    const widget = this._draggedWidget;
    const dragging = this._isDragging;
    const pointerId = this._pointerId;
    this._draggedWidget = null;
    this._isDragging = false;
    this._pointerId = null;
    this._indicator.style.display = 'none';
    this._panel.removeClass('jp-mod-dragging');
    this._panel.node.ownerDocument.removeEventListener('keydown', this, true);
    if (pointerId !== null && this._panel.node.hasPointerCapture(pointerId)) {
      this._panel.node.releasePointerCapture(pointerId);
    }
    if (dragging && widget && position !== undefined) {
      const current = this._panel.widgets.indexOf(widget);
      if (current < 0) {
        return;
      }
      const slot = this._getTargetSlot(position);
      const index = slot > current ? slot - 1 : slot;
      if (index !== current) {
        this._panel.insertWidget(index, widget);
        // Lumino moves the titles visually without updating their DOM order.
        for (const title of this._panel.titles) {
          this._panel.node.appendChild(title);
        }
        this._reordered.emit(widget);
      }
    }
  }

  private static _instances = new WeakMap<
    HTMLElement,
    AccordionPanelReorderer
  >();
  private _trans: TranslationBundle;
  private _observer: MutationObserver;
  private _indicator = document.createElement('div');
  private _isDisposed = false;
  private _draggedWidget: Widget | null = null;
  private _pointerId: number | null = null;
  private _start = 0;
  private _isDragging = false;
  private _reordered = new Signal<this, Widget>(this);
}
