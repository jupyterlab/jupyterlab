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
export function printd(
  this: Widget,
  cssText?: string,
  callback?: PrintdCallback
) {
  _PRINTD.print(this.node, cssText, callback);
}
