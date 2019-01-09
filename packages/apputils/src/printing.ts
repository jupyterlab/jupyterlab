import { Printd } from 'printd';
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
export function isPrintable(a: object): a is IPrintable {
  return printSymbol in a;
}

/**
 * Calls the print symbol on an object to print it.
 */
export function print(a: IPrintable) {
  a[printSymbol]();
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
export function printd(this: Widget) {
  _PRINTD.print(this.node);
}
