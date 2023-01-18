import React from 'react';
import { Dialog, ReactWidget } from '@jupyterlab/apputils';

/**
 * Widget that accepts a React component in `options.body`, passes a
 * `props.closeDialog()` callback, and then instantiates a Dialog widget.
 *
 * Usage notes:
 * - The component must accept a `closeDialog()` prop.
 * - The dialog instance must be manually opened via `ClosableDialog#open()`.
 */
export class ClosableDialog<
  P extends ClosableDialog.BaseProps
> extends Dialog<unknown> {
  constructor(options: ClosableDialog.IOptions<P>) {
    const props: P = {
      ...options.props,
      closeDialog: () => {
        this.dispose();
      }
    } as P;

    const baseDialogOpts: Partial<Dialog.IOptions<unknown>> = {
      ...options.body,
      body: ReactWidget.create(<options.body {...props} />),
      buttons: []
    };

    super(baseDialogOpts);
  }

  /**
   * Opens the dialog.
   *
   * This method is necessary to avoid polluting the console with errors, 
   * because by default, `this.dispose()` causes the promise returned from
   * `Dialog#launch()` to be rejected, which requires manual handling via
   * `Promise#catch()` on every invocation.
   */
  async open(): Promise<void> {
    try {
      await super.launch();
    } catch (e) {
      if (e !== undefined) {
        throw e;
      }
    }
  }
}

export namespace ClosableDialog {
  /**
   * `options` constructor argument type.
   */
  export interface IOptions<P extends BaseProps>
    extends Omit<Partial<Dialog.IOptions<any>>, OmittedOptions> {
    body: React.ComponentType<P & { closeDialog: () => unknown }>;
    props: Omit<P, 'closeDialog'>;
  }

  /**
   * Props that the body component must have.
   */
  export type BaseProps = {
    closeDialog: () => unknown;
  };

  /**
   * Dialog options overriden in the constructor.
   */
  export type OmittedOptions = 'body' | 'buttons';
}
