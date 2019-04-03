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
 *
 * See https://github.com/joseluisq/printd#print
 */

import { Printd } from 'printd';
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
   * Global print instance
   */
  let _PRINTD: Printd | null = null;

  /**
   * We don't create the printd instance initially, because
   * doing so will trigger a false print on FireFox
   *
   * See https://github.com/joseluisq/printd/issues/29
   */
  function getPrintd(): Printd {
    if (_PRINTD) {
      return _PRINTD;
    }
    _PRINTD = new Printd();
    return _PRINTD;
  }

  /**
   * Prints a widget by copying it's DOM node
   * to a hidden iframe and printing that iframe.
   */
  export function printWidget(widget: Widget) {
    getPrintd().print(widget.node);
  }

  /**
   * Prints a URL by loading it into an iframe.
   *
   * @param url URL to load into an iframe.
   */
  export function printURL(url: string) {
    getPrintd().printURL(url);
  }
}
