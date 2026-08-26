// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MessageLoop } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import {
  DEFAULT_NODE_THRESHOLD,
  OptimizedDockPanelSvg,
  REFRESH_DEBOUNCE,
  REFRESH_INTERVAL
} from '../src/dockpanel';

/**
 * Give an element a fixed size, as jsdom reports zero for everything.
 */
function stubRect(el: HTMLElement, width: number, height: number): void {
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => ({})
    })
  });
}

/**
 * A widget holding enough plain DOM to be treated as heavy.
 */
class HeavyWidget extends Widget {
  constructor(width: number, height: number) {
    super({ node: HeavyWidget.createNode() });
    this.content = this.node.firstElementChild as HTMLElement;
    stubRect(this.node, width, height);
    stubRect(this.content, width, height);
  }

  readonly content: HTMLElement;

  protected static createNode(): HTMLElement {
    const node = document.createElement('div');
    const content = document.createElement('div');
    // As an output area does: a widget node whose geometry no layout writes.
    content.classList.add('lm-Widget');
    for (let i = 0; i < DEFAULT_NODE_THRESHOLD + 100; i++) {
      content.appendChild(document.createElement('span'));
    }
    node.appendChild(content);
    return node;
  }
}

/**
 * A pointer event, which jsdom does not implement, faked over a mouse event.
 */
function pointerEvent(
  type: string,
  init: MouseEventInit & { pointerId?: number } = {}
): MouseEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...init
  });
  Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
  return event;
}

/**
 * The inline geometry of an element, as a snapshot to compare against.
 */
function geometry(el: HTMLElement) {
  return {
    width: el.style.width,
    height: el.style.height,
    maxWidth: el.style.maxWidth,
    maxHeight: el.style.maxHeight
  };
}

describe('OptimizedDockPanelSvg', () => {
  let panel: OptimizedDockPanelSvg;
  let first: HeavyWidget;
  let second: HeavyWidget;
  let handle: HTMLElement;

  /**
   * Press the pointer on the split handle, as a resize drag would.
   */
  function pressHandle(): void {
    handle.dispatchEvent(pointerEvent('pointerdown', { button: 0 }));
  }

  /**
   * Release the pointer, ending the drag.
   */
  function releaseHandle(button = 0): void {
    document.dispatchEvent(pointerEvent('pointerup', { button }));
  }

  /**
   * Send a key to the panel, as Lumino does while a drag is in progress.
   */
  function pressKey(keyCode: number): void {
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        keyCode
      } as KeyboardEventInit)
    );
  }

  beforeEach(() => {
    jest.useFakeTimers();

    panel = new OptimizedDockPanelSvg();
    first = new HeavyWidget(640, 480);
    first.id = 'first';
    second = new HeavyWidget(320, 480);
    second.id = 'second';

    panel.addWidget(first);
    panel.addWidget(second, { mode: 'split-right', ref: first });
    Widget.attach(panel, document.body);
    MessageLoop.flush();

    const handles = Array.from(panel.handles());
    if (handles.length === 0) {
      throw new Error('The dock panel was set up without a handle to drag');
    }
    handle = handles[0];
  });

  afterEach(() => {
    if (!panel.isDisposed) {
      panel.dispose();
    }
    jest.useRealTimers();
  });

  describe('#handleEvent()', () => {
    it('should freeze the plain content of heavy widgets during a drag', () => {
      pressHandle();

      // A definite size, not only a maximum: leaving the height to be worked
      // out from the content costs about as much as not freezing at all.
      expect(geometry(first.content)).toEqual({
        width: '640px',
        height: '480px',
        maxWidth: '640px',
        maxHeight: '480px'
      });
      expect(second.content.style.width).toBe('320px');

      releaseHandle();

      expect(geometry(first.content)).toEqual({
        width: '',
        height: '',
        maxWidth: '',
        maxHeight: ''
      });
      expect(second.content.style.width).toBe('');
    });

    it('should leave the geometry of widget nodes to Lumino', () => {
      // Lumino positions widget nodes through `LayoutItem`, which caches the
      // geometry it wrote and does not write it again while it stays the same.
      // Anything else writing to those nodes pins them at a stale size.
      const before = [geometry(first.node), geometry(second.node)];

      pressHandle();

      expect([geometry(first.node), geometry(second.node)]).toEqual(before);

      releaseHandle();

      expect([geometry(first.node), geometry(second.node)]).toEqual(before);
    });

    it('should leave widget nodes alone across a refresh pass', () => {
      const before = [geometry(first.node), geometry(second.node)];

      pressHandle();
      document.dispatchEvent(
        new MouseEvent('pointermove', { bubbles: true, cancelable: true })
      );

      // The refresh is debounced, and then runs over several frames.
      jest.advanceTimersByTime(300);
      jest.advanceTimersByTime(100);

      expect([geometry(first.node), geometry(second.node)]).toEqual(before);
      expect(first.content.style.maxWidth).toBe('640px');
      expect(first.content.style.height).toBe('480px');

      releaseHandle();

      expect([geometry(first.node), geometry(second.node)]).toEqual(before);
      expect(first.content.style.maxWidth).toBe('');
    });

    it('should restore the content when two refresh passes overlap', () => {
      pressHandle();

      // Line the interval up with the pointer move debounce, so that two
      // re-measures are in flight over the same frames.
      jest.advanceTimersByTime(REFRESH_INTERVAL - REFRESH_DEBOUNCE);
      document.dispatchEvent(
        new MouseEvent('pointermove', { bubbles: true, cancelable: true })
      );
      jest.advanceTimersByTime(REFRESH_DEBOUNCE);
      jest.advanceTimersByTime(20);

      releaseHandle();
      jest.advanceTimersByTime(1000);

      expect(geometry(first.content)).toEqual({
        width: '',
        height: '',
        maxWidth: '',
        maxHeight: ''
      });
      expect(geometry(second.content)).toEqual({
        width: '',
        height: '',
        maxWidth: '',
        maxHeight: ''
      });
    });

    it('should freeze widget nodes which no layout positions', () => {
      // The content is a widget node, but nothing writes its geometry, so
      // skipping it would leave the heavy DOM reflowing on every move.
      pressHandle();

      expect(first.content.style.maxWidth).toBe('640px');
    });

    it('should keep the drag alive when a second pointer goes down', () => {
      pressHandle();
      first.node.dispatchEvent(
        pointerEvent('pointerdown', { button: 0, pointerId: 2 })
      );

      releaseHandle();

      expect(first.content.style.maxWidth).toBe('');
    });

    it('should end the drag on a left-button pointerup or Escape', () => {
      pressHandle();

      // Lumino keeps dragging through a right-button release and a Shift
      // press, so the freeze has to hold through both.
      releaseHandle(2);
      pressKey(16);
      expect(first.content.style.maxWidth).toBe('640px');

      pressKey(27);
      expect(first.content.style.maxWidth).toBe('');
    });

    it('should end the drag when the dragging pointer is cancelled', () => {
      pressHandle();
      document.dispatchEvent(pointerEvent('pointercancel', { pointerId: 1 }));

      expect(first.content.style.maxWidth).toBe('');
    });

    it('should ignore another pointer being cancelled', () => {
      pressHandle();
      // A palm resting on a touch screen, cancelled by the browser, is not
      // the pointer holding the handle.
      document.dispatchEvent(pointerEvent('pointercancel', { pointerId: 2 }));

      expect(first.content.style.maxWidth).toBe('640px');

      releaseHandle();

      expect(first.content.style.maxWidth).toBe('');
    });
  });

  describe('#dispose()', () => {
    it('should unfreeze and stop refreshing when disposed mid drag', () => {
      const clear = jest.spyOn(window, 'clearInterval');
      pressHandle();

      panel.dispose();

      expect(first.content.style.maxWidth).toBe('');
      expect(clear).toHaveBeenCalled();
      clear.mockRestore();
    });

    it('should unfreeze when detached mid drag', () => {
      pressHandle();

      Widget.detach(panel);

      expect(first.content.style.maxWidth).toBe('');
    });
  });

  describe('#optimizeResize', () => {
    it('should not freeze anything when disabled', () => {
      panel.optimizeResize = false;

      pressHandle();

      expect(first.content.style.maxWidth).toBe('');
      expect(second.content.style.maxWidth).toBe('');
    });
  });
});
