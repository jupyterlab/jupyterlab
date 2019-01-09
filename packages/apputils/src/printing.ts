/**
 * Any object is printable if it implements the `IPrintable` interface.
 *
 * If you have a custom widget and would like to make it printable, then you
 * should fulfil that interface on that widget by adding a `[printSymbol]` method.
 *
 * One way of printing is to use the `printWidget` function, which creates a hidden iframe
 * and copies the DOM nodes from your widget to that iframe and printing just that iframe.
 *
 * To use this method in your widget, set the `[printSymbol]` method to `printWidget`.
 * You can also provide custom args to that function, including CSS text to apply
 * when printing.
 *
 * See https://github.com/joseluisq/printd#print
 *
 * Another way to print is to use the `printURL` function, which takes a URL and prints that page.
 */

import { Printd, PrintdCallback } from 'printd';
import { Widget } from '@phosphor/widgets';

/**
 * Symbol to use for a method that prints out out the object.
 */
export const printSymbol = Symbol();

/**
 * Widgets who provide a custom way of printing themselves
 * should implement this interface.
 */
export interface IPrintable {
  [printSymbol]: () => void;
}

/**
 * Returns whether an object implements a print method.
 */
export function isPrintable(a: any): a is IPrintable {
  try {
    return printSymbol in a;
  } catch {
    // `in` raises a type error on non objects.
    return false;
  }
}

/**
 * Calls the print symbol on an object to print it.
 */
export function print(a: IPrintable) {
  a[printSymbol]();
}

/**
 * Sets the print method on the parent to that of the child, if it
 * exists on the child.
 */
export function deferPrinting(parent: IPrintable, child: object) {
  if (isPrintable(child)) {
    parent[printSymbol] = child[printSymbol].bind(child);
  }
}

/**
 * Global print instance
 */
const _PRINTD = new Printd();

/**
 * Use this as a print property for a widget that will
 * use the `printd` library to print the node, by
 * creating an iframe and copying the DOM into it.
 */
export function printWidget(
  this: Widget,
  cssText?: string,
  callback?: PrintdCallback
) {
  _PRINTD.print(this.node, cssText, callback);
}

/**
 * Prints a URL by loading it into an iframe.
 *
 * NOTE: When https://github.com/joseluisq/printd/issues/20 is fixed this can be removed.
 * @param url URL to load into an iframe.
 */
export function printURL(url: string) {
  const iframe = _PRINTD.getIFrame();

  // print iframe after it loads new page
  iframe.addEventListener(
    'load',
    () => {
      // copies logic from
      // https://github.com/joseluisq/printd/blob/c7f05196da62d2f2be68386521c0af5908097253/src/index.ts#L62-L69
      const result: boolean = iframe.contentWindow.document.execCommand(
        'print',
        false,
        null
      );

      if (!result) {
        iframe.contentWindow.print();
      }
    },
    { once: true }
  );

  // load new page in iframe
  iframe.src = url;
}
