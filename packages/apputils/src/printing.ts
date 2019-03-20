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

export namespace Printing {
  /**
   * Function that takes no arguments and when invoked prints out some object or null if printing is not defined.
   */
  export type OptionalAsyncThunk = () => Promise<void> | null;

  /**
   * Function that takes in an object and returns a function that prints it or null if it cannot be printed.
   */
  type Handler = (val: unknown) => OptionalAsyncThunk;

  /**
   * Combines two print creators so that both are called in sequence.
   */
  function combineHandlers(f: Handler, g: Handler): Handler {
    return (val: unknown) => {
      const fRes = f(val);
      if (fRes !== null) {
        return fRes;
      }
      return g(val);
    };
  }

  function combineManyHandlers(fs: Iterable<Handler>): Handler {
    return [...fs].reduce(combineHandlers, () => null);
  }

  class Registry {
    constructor() {
      this._handlerAdded = new Signal(this);
    }

    /**
     * Adds a print function to the registry.
     */
    registerHandler(handlers: Handler) {
      this._handlers.push(handlers);
    }

    /**
     * Returns the print thunk for an object or null if it does not exist.
     */
    resolve(val: unknown): OptionalAsyncThunk {
      return combineManyHandlers(this._handlers)(val);
    }

    /**
     * Returns a signal that is triggered after a new printer is added.
     */
    get handlerAdded(): ISignal<Registry, Handler> {
      return this._handlerAdded;
    }

    private readonly _handlers = new Array<Handler>();
    private readonly _handlerAdded: Signal<Registry, Handler>;
  }

  /**
   * Export a global registry for printing.
   *
   * We could move this to an extension if we prefer.
   */
  export const registry = new Registry();
  /**
   * Symbol to use for a method that returns a function to print an object.
   */
  export const symbol = Symbol('print function');

  /**
   * Objects who provide a custom way of printing themselves
   * should implement this interface.
   */
  export interface IProvidesHandler {
    /**
     * Returns a function to print this object or null if it cannot be printed.
     */
    [symbol]: () => OptionalAsyncThunk;
  }

  /**
   * Returns whether an object implements a print method.
   */
  export function providesHandler(a: any): a is IProvidesHandler {
    try {
      return symbol in a;
    } catch {
      // `in` raises a type error on non objects.
      return false;
    }
  }

  /**
   * Returns the print function for an object, or null if it does not provide a handler.
   */
  export function retrievePrintFunction(val: unknown): OptionalAsyncThunk {
    if (providesHandler(val)) {
      return val[symbol]();
    }
    return null;
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
    widget: Widget,
    cssText?: string,
    callback?: PrintdCallback
  ) {
    // // reset URL if it's set.
    // const iframe = _PRINTD.getIFrame();
    // iframe.src = 'about://blank';

    _PRINTD.print(widget.node, [cssText], [], callback);
  }

  /**
   * Prints a URL by loading it into an iframe.
   *
   * @param url URL to load into an iframe.
   */
  export function printURL(url: string) {
    _PRINTD.printURL('url');
    // const iframe = _PRINTD.getIFrame();

    // // print iframe after it loads new page
    // iframe.addEventListener(
    //   'load',
    //   () => {
    //     // copies logic from
    //     // https://github.com/joseluisq/printd/blob/c7f05196da62d2f2be68386521c0af5908097253/src/index.ts#L62-L69
    //     const result: boolean = iframe.contentWindow.document.execCommand(
    //       'print',
    //       false,
    //       null
    //     );

    //     if (!result) {
    //       iframe.contentWindow.print();
    //     }
    //   },
    //   { once: true }
    // );

    // // load new page in iframe
    // iframe.src = url;
  }
}
