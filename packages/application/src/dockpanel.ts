import { DockPanelSvg } from '@jupyterlab/ui-components';
import type { Message } from '@lumino/messaging';
import type { Widget } from '@lumino/widgets';

export const DEFAULT_NODE_THRESHOLD = 1000;
export const DEFAULT_TEXT_LENGTH_THRESHOLD = 25000;

/**
 * Milliseconds after the last pointer move before the frozen sizes are
 * re-measured.
 */
export const REFRESH_DEBOUNCE = 300;

/**
 * Milliseconds between re-measures while a drag is held still.
 */
export const REFRESH_INTERVAL = 3000;

/**
 * A dock panel that freezes heavy panel dimensions during handle drags to
 * reduce layout reflow and improve resize performance.
 */
export class OptimizedDockPanelSvg extends DockPanelSvg {
  /**
   * Handle the DOM events for the dock panel.
   *
   * @param event - The DOM event sent to the panel.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events registered for the node. It should
   * not be called directly by user code.
   */
  override handleEvent(event: Event): void {
    // Only the pointer which started the drag can end it. A second pointer
    // going down elsewhere must not be mistaken for the drag ending, or the
    // panels stay frozen for good.
    if (event.type === 'pointerdown' && !this._isResizeDragActive) {
      this._isResizeDragActive = this._isHandlePointerDown(event);
      if (this._isResizeDragActive) {
        this._dragPointerId = (event as PointerEvent).pointerId;
        // Installed here rather than below, so that the listener and the flag
        // are always set together, whether or not the freeze is enabled.
        this._listenForCancel();
      }
    }

    // Unfreeze before super processes the drag-release events so Lumino
    // measures natural sizes when it finalises the split position.
    if (
      this._isResizeDragActive &&
      Private.endsDrag(event, this._dragPointerId)
    ) {
      this._endDrag();
    }

    super.handleEvent(event);

    if (!this._optimizeResize) {
      return;
    }

    if (event.type === 'pointerdown' && this._isResizeDragActive) {
      this._freezeHeavyLeaves();
    } else if (event.type === 'pointermove' && this._isResizeDragActive) {
      this._scheduleRefresh();
    }
  }

  /**
   * Dispose of the resources held by the panel.
   */
  override dispose(): void {
    this._endDrag();
    super.dispose();
  }

  /**
   * A message handler invoked on an `'after-detach'` message.
   *
   * #### Notes
   * Lumino ends a handle drag on detach without an event reaching
   * `handleEvent`, so the drag has to be ended here as well.
   */
  protected override onAfterDetach(msg: Message): void {
    this._endDrag();
    super.onAfterDetach(msg);
  }

  /**
   * Stop the drag and put back everything it froze.
   */
  private _endDrag(): void {
    this._isResizeDragActive = false;
    this._dragPointerId = -1;
    if (this._cancelListener) {
      this._cancelListener.removeEventListener('pointercancel', this, true);
      this._cancelListener = null;
    }
    this._unfreezeElements();
  }

  /**
   * Listen for the drag being cancelled, which Lumino does not listen for.
   *
   * #### Notes
   * A pen or touch drag taken over by a system gesture ends with
   * `pointercancel` and no `pointerup`, so without this the panels would stay
   * frozen.
   */
  private _listenForCancel(): void {
    if (this._cancelListener) {
      return;
    }
    this._cancelListener = this.node.ownerDocument;
    this._cancelListener.addEventListener('pointercancel', this, true);
  }

  private _isHandlePointerDown(event: Event): boolean {
    const pointerEvent = event as PointerEvent;
    if (pointerEvent.button !== 0) {
      return false;
    }
    const target = pointerEvent.target;
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    for (const handle of this.handles()) {
      if (handle.contains(target)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Whether resize optimizations are enabled.
   *
   * When `true` (the default), panels with heavy DOM content have their
   * dimensions frozen during a handle drag, avoiding repeated reflows.
   * Setting this to `false` immediately unfreezes any frozen panels.
   */
  get optimizeResize(): boolean {
    return this._optimizeResize;
  }

  set optimizeResize(enabled: boolean) {
    this._optimizeResize = enabled;
    if (!enabled) {
      this._unfreezeElements();
    }
  }

  private _freezeHeavyLeaves(): void {
    if (this._frozenGroups.length > 0) {
      return;
    }

    const targets: Widget[] = [];
    for (const child of this.widgets()) {
      this._collectHeavyWidgets(child, targets);
    }

    for (const target of targets) {
      const head = target.node;
      const candidates: HTMLElement[] = [head];
      for (let i = 0; i < head.children.length; i++) {
        candidates.push(head.children[i] as HTMLElement);
      }

      // Leave the elements whose geometry Lumino owns untouched; freezing
      // those corrupts the layout, see `Private.isLayoutManaged`.
      const elements = candidates.filter(el => !Private.isLayoutManaged(el));
      if (elements.length === 0) {
        continue;
      }

      // Read all rects before writing to avoid layout thrashing.
      const rects = elements.map(el => el.getBoundingClientRect());

      const frozenGroup: Private.IFrozenElement[] = elements.map(el => ({
        element: el,
        prevWidth: el.style.width,
        prevMaxWidth: el.style.maxWidth,
        prevHeight: el.style.height,
        prevMaxHeight: el.style.maxHeight
      }));

      for (let i = 0; i < frozenGroup.length; i++) {
        Private.pinToRect(frozenGroup[i].element, rects[i]);
      }
      this._frozenGroups.push(frozenGroup);
    }

    if (this._frozenGroups.length > 0 && this._intervalId === 0) {
      this._intervalId = window.setInterval(() => {
        this._refreshFrozenElements();
      }, REFRESH_INTERVAL);
    }
  }

  private _scheduleRefresh(): void {
    if (this._frozenGroups.length === 0) {
      return;
    }
    if (this._refreshTimerId !== 0) {
      clearTimeout(this._refreshTimerId);
    }
    this._refreshTimerId = window.setTimeout(() => {
      this._refreshTimerId = 0;
      this._refreshFrozenElements();
    }, REFRESH_DEBOUNCE);
  }

  private _refreshFrozenElements(): void {
    // A refresh spans several frames, and both the interval and the pointer
    // move debounce can start one. Stamp each pass so that a pass started
    // while another is in flight replaces it instead of running alongside it;
    // two passes sharing `_refreshRAFId` would leave one of them impossible
    // to cancel, and it would then re-apply sizes to elements that are no
    // longer frozen.
    this._cancelRefresh();
    const generation = this._refreshGeneration;

    let g = 0;
    const step = () => {
      if (generation !== this._refreshGeneration) {
        return;
      }
      if (g >= this._frozenGroups.length) {
        this._refreshRAFId = 0;
        return;
      }

      let group = this._frozenGroups[g];
      for (let entry of group) {
        let el = entry.element;
        el.style.width = '';
        el.style.maxWidth = '';
        el.style.height = '';
        el.style.maxHeight = '';
      }

      this._refreshRAFId = requestAnimationFrame(() => {
        if (generation !== this._refreshGeneration) {
          return;
        }
        let rects = group.map(entry => entry.element.getBoundingClientRect());
        for (let i = 0; i < group.length; i++) {
          Private.pinToRect(group[i].element, rects[i]);
        }
        g++;
        this._refreshRAFId = requestAnimationFrame(step);
      });
    };

    this._refreshRAFId = requestAnimationFrame(step);
  }

  /**
   * Stop any refresh pass which is in flight.
   */
  private _cancelRefresh(): void {
    this._refreshGeneration++;
    if (this._refreshRAFId !== 0) {
      cancelAnimationFrame(this._refreshRAFId);
      this._refreshRAFId = 0;
    }
  }

  private _unfreezeElements(): void {
    if (this._refreshTimerId !== 0) {
      clearTimeout(this._refreshTimerId);
      this._refreshTimerId = 0;
    }
    this._cancelRefresh();
    if (this._intervalId !== 0) {
      clearInterval(this._intervalId);
      this._intervalId = 0;
    }

    for (let group of this._frozenGroups) {
      for (let entry of group) {
        entry.element.style.width = entry.prevWidth;
        entry.element.style.maxWidth = entry.prevMaxWidth;
        entry.element.style.height = entry.prevHeight;
        entry.element.style.maxHeight = entry.prevMaxHeight;
      }
    }

    this._frozenGroups = [];
  }

  private _collectHeavyWidgets(widget: Widget, result: Widget[]): void {
    if (!this._isDOMHeavy(widget.node)) {
      return;
    }

    let layout = widget.layout;
    if (!layout) {
      result.push(widget);
      return;
    }

    let anyChildHeavy = false;
    for (let child of layout) {
      if (this._isDOMHeavy(child.node)) {
        anyChildHeavy = true;
        break;
      }
    }

    if (anyChildHeavy) {
      for (let child of layout) {
        this._collectHeavyWidgets(child, result);
      }
    } else {
      result.push(widget);
    }
  }

  private _isDOMHeavy(el: HTMLElement): boolean {
    if (el.querySelectorAll('*').length >= DEFAULT_NODE_THRESHOLD) {
      return true;
    }
    if ((el.textContent?.length ?? 0) >= DEFAULT_TEXT_LENGTH_THRESHOLD) {
      return true;
    }
    return false;
  }

  private _optimizeResize = true;
  private _isResizeDragActive = false;
  private _dragPointerId = -1;
  private _cancelListener: Document | null = null;
  private _frozenGroups: Private.IFrozenElement[][] = [];
  private _refreshTimerId = 0;
  private _refreshRAFId = 0;
  private _refreshGeneration = 0;
  private _intervalId = 0;
}

/** Namespace for OptimizedDockPanelSvg statics */
namespace Private {
  /**
   * Whether a Lumino layout owns the geometry of the given element.
   *
   * #### Notes
   * Lumino positions widget nodes through `LayoutItem`, which remembers the
   * geometry it last wrote and skips writing `width` or `height` again when
   * the value did not change. Anything else writing those properties leaves
   * the DOM out of step with that record for as long as the layout keeps
   * computing the same size, which pins the widget at a stale size.
   * `LayoutItem.fit()` also reads `max-width` and `max-height` back off the
   * node into the limits it clamps against, so an injected maximum can
   * survive well past the drag which set it. Split handles are written the
   * same way, without going through `LayoutItem`.
   *
   * Both are set up with an inline `position: absolute`, which is what this
   * tests for. Testing for the `lm-Widget` class instead would also skip
   * widget nodes of layouts which never write geometry, such as the outputs
   * of an output area, and leave nothing to freeze. Should Lumino stop
   * setting the position inline, this errs towards freezing less rather than
   * towards corrupting a layout.
   */
  export function isLayoutManaged(el: HTMLElement): boolean {
    return el.style.position === 'absolute';
  }

  /**
   * Whether the event ends a handle drag, matching the rules Lumino releases
   * the drag on, plus the cancellation Lumino does not listen for.
   */
  export function endsDrag(event: Event, dragPointerId: number): boolean {
    switch (event.type) {
      case 'pointerup':
        return (event as PointerEvent).button === 0;
      case 'pointercancel':
        // An unrelated pointer being cancelled, a palm resting on a touch
        // screen for instance, must not end a drag it was never part of.
        return (event as PointerEvent).pointerId === dragPointerId;
      case 'keydown':
        return (event as KeyboardEvent).keyCode === 27;
      default:
        return false;
    }
  }

  /**
   * Hold an element at the size it has now, so that resizing an ancestor does
   * not make the browser lay out its contents again.
   */
  export function pinToRect(el: HTMLElement, rect: DOMRect): void {
    el.style.width = `${rect.width}px`;
    el.style.maxWidth = `${rect.width}px`;
    el.style.height = `${rect.height}px`;
    el.style.maxHeight = `${rect.height}px`;
  }

  export interface IFrozenElement {
    element: HTMLElement;
    prevWidth: string;
    prevMaxWidth: string;
    prevHeight: string;
    prevMaxHeight: string;
  }
}
