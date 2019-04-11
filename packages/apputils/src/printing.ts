/**
 * Any object is "printable" if it implements the `IPrintable` interface.
 *
 * To do this it, it must have a method called `Printing.symbol` which returns either a function
 * to print the object or null if it cannot be printed.
 *
 * One way of printing is to use the `printWidget` function, which creates a hidden iframe
 * and copies the DOM nodes from your widget to that iframe and printing just that iframe.
 *
 * Another way to print is to use the `printURL` function, which takes a URL and prints that page.
 */

import { Widget } from '@phosphor/widgets';

export namespace Printing {
  /**
   * Function that takes no arguments and when invoked prints out some object or null if printing is not defined.
   */
  export type OptionalAsyncThunk = () => Promise<void> | null;

  /**
   * Symbol to use for a method that returns a function to print an object.
   */
  export const symbol = Symbol('printable');

  /**
   * Objects who provide a custom way of printing themselves
   * should implement this interface.
   */
  export interface IPrintable {
    /**
     * Returns a function to print this object or null if it cannot be printed.
     */
    [symbol]: () => OptionalAsyncThunk;
  }

  /**
   * Returns whether an object implements a print method.
   */
  export function isPrintable(a: unknown): a is IPrintable {
    if (typeof a !== 'object' || !a) {
      return false;
    }
    return symbol in a;
  }

  /**
   * Returns the print function for an object, or null if it does not provide a handler.
   */
  export function getPrintFunction(val: unknown): OptionalAsyncThunk {
    if (isPrintable(val)) {
      return val[symbol]();
    }
    return null;
  }

  /**
   * Prints a widget by copying it's DOM node
   * to a hidden iframe and printing that iframe.
   */
  export function printWidget(widget: Widget): Promise<void> {
    return printContent(widget.node);
  }

  /**
   * Prints a URL by loading it into an iframe.
   *
   * @param url URL to load into an iframe.
   */
  export function printURL(url: string): Promise<void> {
    return printContent(url);
  }

  /**
   * Prints a URL or an element in an iframe and then removes the iframe after printing.
   */
  async function printContent(urlOrEl: string | HTMLElement): Promise<void> {
    const isURL = typeof urlOrEl === 'string';
    const parent = window.document.body;
    const iframe = createIFrame(isURL ? (urlOrEl as string) : 'about:blank');
    parent.appendChild(iframe);

    if (!isURL) {
      setIFrameNode(iframe, urlOrEl as HTMLElement);
    }

    await resolveWhenLoaded(iframe.contentWindow);
    launchPrint(iframe.contentWindow);

    // parent.removeChild(iframe);
  }

  /**
   * Creates a new hidden iframe and appends it to the document
   *
   * Modified from
   * https://github.com/joseluisq/printd/blob/eb7948d602583c055ab6dee3ee294b6a421da4b6/src/index.ts#L24
   *
   * Made source a parameter
   */
  function createIFrame(src: string): HTMLIFrameElement {
    const el = window.document.createElement('iframe');
    const css =
      'visibility:hidden;width:0;height:0;position:absolute;z-index:-9999;bottom:0;';

    el.setAttribute('src', src);
    el.setAttribute('style', css);
    el.setAttribute('width', '0');
    el.setAttribute('height', '0');
    el.setAttribute('wmode', 'opaque');

    return el;
  }

  /**
   * Copies a node from the base document to the iframe.
   */
  function setIFrameNode(iframe: HTMLIFrameElement, node: HTMLElement) {
    // https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation/createHTMLDocument

    // Create new document
    const newDocument = iframe.contentDocument.implementation.createHTMLDocument(
      'JupyterLab'
    );
    // Copy node into document
    newDocument.body.appendChild(newDocument.importNode(node, true));

    // Copy document node into iframe document.
    iframe.contentDocument.replaceChild(
      iframe.contentDocument.importNode(newDocument.documentElement, true),
      iframe.contentDocument.documentElement
    );
  }

  /**
   * Promise that resolves when all resources are loaded in the window.
   */
  function resolveWhenLoaded(contentWindow: Window): Promise<void> {
    // If document is already loaded, the load event won't be fired
    // again, so just return immediately.
    // if (contentWindow.document.readyState === 'complete') {
    //   return Promise.resolve();
    // }
    return new Promise((resolve, reject) => {
      contentWindow.addEventListener(
        'load',
        () => {
          console.log('loaded');
          resolve();
        },
        false
      );
    });
  }

  /**
   * Prints a content window.
   */
  function launchPrint(contentWindow: Window) {
    // execCommand works on all but firefox
    //  https://github.com/joseluisq/printd/blob/eb7948d602583c055ab6dee3ee294b6a421da4b6/src/index.ts#L148
    const result = contentWindow.document.execCommand('print', false, null);

    if (!result) {
      contentWindow.print();
    }
  }
}
