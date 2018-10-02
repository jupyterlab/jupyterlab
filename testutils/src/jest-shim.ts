// Shims originally adapted from https://github.com/nteract/nteract/blob/47f8b038ff129543e42c39395129efc433eb4e90/scripts/test-shim.js

const fetchMod = ((window as any).fetch = require('node-fetch')); // tslint:disable-line
(window as any).Request = fetchMod.Request;
(window as any).Headers = fetchMod.Headers;

(global as any).Image = (window as any).Image;
(global as any).Range = function Range() {};

const createContextualFragment = (html: string) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.children[0]; // so hokey it's not even funny
};

(global as any).Range.prototype.createContextualFragment = (html: string) =>
  createContextualFragment(html);

window.focus = () => {};

// HACK: Polyfill that allows codemirror to render in a JSDOM env.
(window as any).document.createRange = function createRange() {
  return {
    setEnd: () => {},
    setStart: () => {},
    getBoundingClientRect: () => ({ right: 0 }),
    getClientRects: (): ClientRect[] => [],
    createContextualFragment
  };
};

process.on('unhandledRejection', (error, promise) => {
  console.error('Unhandled promise rejection somewhere in tests');
  console.error(error);
  console.error(error.stack);
  promise.catch(err => console.error('promise rejected', err));
});
