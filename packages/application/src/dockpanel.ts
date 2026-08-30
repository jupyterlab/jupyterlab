import { DockPanelSvg } from '@jupyterlab/ui-components';
import type { Widget } from '@lumino/widgets';

const DEFAULT_NODE_THRESHOLD = 1000;
const DEFAULT_TEXT_LENGTH_THRESHOLD = 25000;

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
    if (event.type === 'pointerdown') {
      this._isResizeDragActive = this._isHandlePointerDown(event);
    }

    // Unfreeze before super processes the drag-release events so Lumino
    // measures natural sizes when it finalises the split position.
    if (this._frozenGroups.length > 0 && this._isResizeDragActive) {
      const t = event.type;
      if (t === 'pointerup' || t === 'pointercancel' || t === 'keydown') {
        this._isResizeDragActive = false;
        this._unfreezeElements();
      }
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
      const elements: HTMLElement[] = [head];
      for (let i = 0; i < head.children.length; i++) {
        elements.push(head.children[i] as HTMLElement);
      }

      // Read all rects before writing to avoid layout thrashing.
      const rects = elements.map(el => el.getBoundingClientRect());

      const frozenGroup: Private.IFrozenElement[] = elements.map((el, i) => ({
        element: el,
        isHead: i === 0,
        prevWidth: el.style.width,
        prevMaxWidth: el.style.maxWidth,
        prevHeight: el.style.height,
        prevMaxHeight: el.style.maxHeight
      }));

      for (let i = 0; i < frozenGroup.length; i++) {
        const el = frozenGroup[i].element;
        const rect = rects[i];
        el.style.width = `${rect.width}px`;
        el.style.maxWidth = `${rect.width}px`;
        el.style.maxHeight = `${rect.height}px`;
        if (frozenGroup[i].isHead) {
          el.style.height = `${rect.height}px`;
        }
      }
      this._frozenGroups.push(frozenGroup);
    }

    if (this._frozenGroups.length > 0 && this._intervalId === 0) {
      this._intervalId = window.setInterval(() => {
        this._refreshFrozenElements();
      }, 3000);
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
    }, 300);
  }

  private _refreshFrozenElements(): void {
    let g = 0;
    const step = () => {
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
        let rects = group.map(entry => entry.element.getBoundingClientRect());
        for (let i = 0; i < group.length; i++) {
          let entry = group[i];
          let rect = rects[i];
          let el = entry.element;
          el.style.width = `${rect.width}px`;
          el.style.maxWidth = `${rect.width}px`;
          el.style.maxHeight = `${rect.height}px`;
          if (entry.isHead) {
            el.style.height = `${rect.height}px`;
          }
        }
        g++;
        this._refreshRAFId = requestAnimationFrame(step);
      });
    };

    this._refreshRAFId = requestAnimationFrame(step);
  }

  private _unfreezeElements(): void {
    if (this._refreshTimerId !== 0) {
      clearTimeout(this._refreshTimerId);
      this._refreshTimerId = 0;
    }
    if (this._refreshRAFId !== 0) {
      cancelAnimationFrame(this._refreshRAFId);
      this._refreshRAFId = 0;
    }
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
  private _frozenGroups: Private.IFrozenElement[][] = [];
  private _refreshTimerId = 0;
  private _refreshRAFId = 0;
  private _intervalId = 0;
}

/** Namespace for OptimizedDockPanelSvg statics */
namespace Private {
  export interface IFrozenElement {
    element: HTMLElement;
    isHead: boolean;
    prevWidth: string;
    prevMaxWidth: string;
    prevHeight: string;
    prevMaxHeight: string;
  }
}
