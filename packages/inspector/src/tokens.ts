// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@lumino/coreutils';
import { ISignal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';

/**
 * The inspector panel token.
 */
export const IInspector = new Token<IInspector>(
  '@jupyterlab/inspector:IInspector',
  `A service for adding contextual help to widgets (visible using "Show Contextual Help" from the Help menu).
  Use this to hook into the contextual help system in your extension.`
);

/**
 * An interface for an inspector.
 */
export interface IInspector {
  /**
   * The source of events the inspector listens for.
   */
  source: IInspector.IInspectable | null;
}

/**
 * A namespace for inspector interfaces.
 */
export namespace IInspector {
  /**
   * The definition of an inspectable source.
   */
  export interface IInspectable {
    /**
     * A signal emitted when the inspector should clear all items.
     */
    cleared: ISignal<any, void>;

    /**
     * A signal emitted when the inspectable is disposed.
     */
    disposed: ISignal<any, void>;

    /**
     * A signal emitted when an inspector value is generated.
     */
    inspected: ISignal<any, IInspectorUpdate>;

    /**
     * Test whether the inspectable has been disposed.
     */
    isDisposed: boolean;

    /**
     * Indicates whether the inspectable source emits signals.
     *
     * #### Notes
     * The use case for this attribute is to limit the API traffic when no
     * inspector is visible. It can be modified by the consumer of the source.
     */
    standby: boolean;
    /**
     * Handle a text changed signal from an editor.
     *
     * #### Notes
     * Update the hints inspector based on a text change.
     */
    onEditorChange(customText?: string): void;
  }

  /**
   * An update value for code inspectors.
   */
  export interface IInspectorUpdate {
    /**
     * The content being sent to the inspector for display.
     */
    content: Widget | null;
  }
}
