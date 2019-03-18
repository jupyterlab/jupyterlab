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
import { Signal, ISignal } from '@phosphor/signaling';

/**
 * Function that takes no arguments and when invoked prints out some object.
 */
type PrintThunk = () => Promise<void>;

/**
 * Function that takes in an object and returns a thunk that will print that object or null
 * if printing is not supported for that object.
 */
type PrintFunction = (val: unknown) => PrintThunk | null;

/**
 * Combines two print functions into a resulting print function that calls both in sequence, returning
 * the first print function if it is returned.
 */
function combinePrintFunctions(
  f: PrintFunction,
  g: PrintFunction
): PrintFunction {
  return (val: unknown) => {
    const fRes = f(val);
    if (fRes !== null) {
      return fRes;
    }
    return g(val);
  };
}

function combineManyPrintFunctions(fs: Iterable<PrintFunction>): PrintFunction {
  return [...fs].reduce(combinePrintFunctions, () => null);
}

export class PrintRegistry {
  constructor() {
    this._printerAdded = new Signal(this);
  }

  /**
   * Adds a print function to the registry.
   */
  addPrintFunction(fn: PrintFunction) {
    this._printers.push(fn);
  }

  /**
   * Returns the printer thunk for an object or null if it does not exist.
   */
  getPrinter(val: unknown): PrintThunk | null {
    return combineManyPrintFunctions(this._printers)(val);
  }

  /**
   * Returns a signal that is triggered after a new printer is added.
   */
  get printerAdded(): ISignal<PrintRegistry, PrintFunction> {
    return this._printerAdded;
  }

  private readonly _printers = new Array<PrintFunction>();
  private readonly _printerAdded: Signal<PrintRegistry, PrintFunction>;
}

/**
 * Symbol to use for a method that prints out out the object.
 */
export const printSymbol = Symbol();

/**
 * Objects who provide a custom way of printing themselves
 * should implement this interface.
 */
export interface IPrintable {
  [printSymbol]: () => Promise<void>;
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
export function printPrintable(a: IPrintable): Promise<void> {
  return a[printSymbol]();
}

/**
 * Sets the print method on the parent to that of the child, if it
 * exists on the child.
 */
export function delegatePrintMethod(parent: IPrintable, child: object) {
  if (isPrintable(child)) {
    parent[printSymbol] = child[printSymbol].bind(child);
  }
}

export function printableFunction(val: unknown): PrintThunk | null {
  if (!isPrintable(val)) {
    return null;
  }
  return () => printPrintable(val);
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
  // reset URL if it's set.
  const iframe = _PRINTD.getIFrame();
  iframe.src = 'about://blank';

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
