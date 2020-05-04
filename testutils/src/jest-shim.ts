// Shims originally adapted from https://github.com/nteract/nteract/blob/47f8b038ff129543e42c39395129efc433eb4e90/scripts/test-shim.js

const fetchMod = ((window as any).fetch = require('node-fetch')); // tslint:disable-line
(window as any).Request = fetchMod.Request;
(window as any).Headers = fetchMod.Headers;
(window as any).Response = fetchMod.Response;

(global as any).Image = (window as any).Image;
(global as any).Range = function Range() {
  /* no-op */
};

// HACK: Polyfill that allows CodeMirror to render in a JSDOM env.
const createContextualFragment = (html: string) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.children[0]; // so hokey it's not even funny
};

(global as any).Range.prototype.createContextualFragment = (html: string) =>
  createContextualFragment(html);

(window as any).document.createRange = function createRange() {
  return {
    setEnd: () => {
      /* no-op */
    },
    setStart: () => {
      /* no-op */
    },
    getBoundingClientRect: () => ({ right: 0 }),
    getClientRects: (): ClientRect[] => [],
    createContextualFragment
  };
};
// end CodeMirror HACK

window.focus = () => {
  /* JSDom throws "Not Implemented" */
};

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
