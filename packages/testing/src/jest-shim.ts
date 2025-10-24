/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

// Shims originally adapted from https://github.com/nteract/nteract/blob/47f8b038ff129543e42c39395129efc433eb4e90/scripts/test-shim.js

/* global globalThis */

import { DataTransferMock } from './jest-data-transfer-mock';

globalThis.DragEvent = class DragEvent extends Event {
  dataTransfer: DataTransfer;
  constructor(
    type: string,
    dragEventInit: {
      dataTransfer: DataTransfer;
    }
  ) {
    super(type);
    this.dataTransfer = dragEventInit.dataTransfer;
  }
} as any;

if (
  typeof globalThis.TextDecoder === 'undefined' ||
  typeof globalThis.TextEncoder === 'undefined'
) {
  const util = require('util');
  globalThis.TextDecoder = util.TextDecoder;
  globalThis.TextEncoder = util.TextEncoder;
}

globalThis.Image = (window as any).Image;
globalThis.Range = function Range() {
  /* no-op */
} as any;

// HACK: Polyfill that allows CodeMirror to render in a JSDOM env.
const createContextualFragment = (html: string) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.children[0]; // so hokey it's not even funny
};

globalThis.Range.prototype.createContextualFragment = (html: string) =>
  createContextualFragment(html) as any;

(window as any).document.createRange = function createRange() {
  return {
    setEnd: () => {
      /* no-op */
    },
    setStart: () => {
      /* no-op */
    },
    getBoundingClientRect: () => ({ right: 0 }),
    getClientRects: (): DOMRect[] => [],
    createContextualFragment
  };
};
// end CodeMirror HACK

window.focus = () => {
  /* JSDom throws "Not Implemented" */
};

/**
 * Shim scrollTo because jsdom still does not implement a shim for it, see:
 * https://github.com/jsdom/jsdom/issues/2751
 */
window.Element.prototype.scrollTo = (
  _optionsOrX?: ScrollToOptions | number
) => {
  // no-op
};

// https://github.com/jsdom/jsdom/issues/3368
class ResizeObserverMock {
  constructor(_callback: ResizeObserverCallback) {
    // no-op
  }
  observe(_target: Element, _options?: ResizeObserverOptions) {
    // no-op
  }
  unobserve(_target: Element) {
    // no-op
  }
  disconnect() {
    // no-op
  }
}

// https://github.com/jsdom/jsdom/issues/2032
class IntersectionObserverMock {
  constructor(
    _callback: IntersectionObserverCallback,
    _options?: IntersectionObserverInit
  ) {
    // no-op
  }
  observe(_target: Element) {
    // no-op
  }
  unobserve(_target: Element) {
    // no-op
  }
  disconnect() {
    // no-op
  }
  takeRecords() {
    return [];
  }
  root = document;
  rootMargin = '0px 0px 0px 0px';
  thresholds = [0];
}

window.IntersectionObserver = IntersectionObserverMock;

window.ResizeObserver = ResizeObserverMock;

window.DataTransfer = DataTransferMock;

// https://github.com/jsdom/jsdom/issues/1568
class ClipboardEventMock extends Event implements ClipboardEvent {
  constructor(
    type: 'copy' | 'cut' | 'paste',
    options: { clipboardData: DataTransfer }
  ) {
    super(type);
    this.clipboardData = options.clipboardData;
  }
  clipboardData: DataTransfer;
}

window.ClipboardEvent = ClipboardEventMock;

(window as any).document.elementFromPoint = (left: number, top: number) =>
  document.body;

if (!window.hasOwnProperty('getSelection')) {
  // Minimal getSelection() that supports a fake selection
  (window as any).getSelection = function getSelection() {
    return {
      _selection: '',
      selectAllChildren: () => {
        this._selection = 'foo';
      },
      toString: () => {
        const val = this._selection;
        this._selection = '';
        return val;
      }
    };
  };
}

// Used by xterm.js
(window as any).matchMedia = function (media: string): MediaQueryList {
  return {
    matches: false,
    media,
    onchange: () => {
      /* empty */
    },
    addEventListener: () => {
      /* empty */
    },
    removeEventListener: () => {
      /* empty */
    },
    dispatchEvent: () => {
      return true;
    },
    addListener: () => {
      /* empty */
    },
    removeListener: () => {
      /* empty */
    }
  };
};

process.on('unhandledRejection', (error, promise) => {
  console.error('Unhandled promise rejection somewhere in tests');
  if (error) {
    console.error(error);
    const stack = (error as any).stack;
    if (stack) {
      console.error(stack);
    }
  }
  promise.catch(err => console.error('promise rejected', err));
});

if ((window as any).requestIdleCallback === undefined) {
  // On Safari, requestIdleCallback is not available, so we use replacement functions for `idleCallbacks`
  // See: https://developer.mozilla.org/en-US/docs/Web/API/Background_Tasks_API#falling_back_to_settimeout
  // eslint-disable-next-line @typescript-eslint/ban-types
  (window as any).requestIdleCallback = function (handler: Function) {
    let startTime = Date.now();
    return setTimeout(function () {
      handler({
        didTimeout: false,
        timeRemaining: function () {
          return Math.max(0, 50.0 - (Date.now() - startTime));
        }
      });
    }, 1);
  };

  (window as any).cancelIdleCallback = function (id: number) {
    clearTimeout(id);
  };
}
