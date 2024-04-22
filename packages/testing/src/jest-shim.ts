/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

// Shims originally adapted from https://github.com/nteract/nteract/blob/47f8b038ff129543e42c39395129efc433eb4e90/scripts/test-shim.js

/* global globalThis */

globalThis.DragEvent = class DragEvent {} as any;

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
  constructor(_callback: any) {
    // no-op
  }
  observe(_target: any, _options?: any) {
    // no-op
  }
  unobserve(_target: any) {
    // no-op
  }
  disconnect() {
    // no-op
  }
}

window.ResizeObserver = ResizeObserverMock;

// https://github.com/jsdom/jsdom/issues/2913
class DataTransferItemMock implements DataTransferItem {
  constructor(
    protected format: string,
    protected value: string
  ) {
    // no-op
  }
  get kind() {
    return 'string';
  }
  get type() {
    return this.format;
  }
  getAsString(callback: (v: string) => undefined): undefined {
    callback(this.value);
  }
  getAsFile() {
    return null as any;
  }
  webkitGetAsEntry() {
    return null as any;
  }
}

// https://github.com/jsdom/jsdom/issues/2913
class DataTransferMock implements DataTransfer {
  dropEffect: DataTransfer['dropEffect'] = 'none';
  effectAllowed: DataTransfer['dropEffect'] = 'none';
  files: DataTransfer['files'];
  get items(): DataTransfer['items'] {
    return [
      ...Object.entries(this._data).map(
        ([k, v]) => new DataTransferItemMock(k, v)
      )
    ] as unknown as DataTransferItemList;
  }
  readonly types: DataTransfer['types'] = [];
  getData(format: string) {
    return this._data[format];
  }
  setData(format: string, data: string) {
    this._data[format] = data;
  }
  clearData() {
    this._data = {};
  }
  setDragImage(imgElement: Element, xOffset: number, yOffset: number) {
    // no-op
  }
  private _data: Record<string, string> = {};
}

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
