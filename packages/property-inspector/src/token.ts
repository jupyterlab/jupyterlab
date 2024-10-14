// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { Widget } from '@lumino/widgets';
import * as React from 'react';

/**
 * A property inspector interface provided when registering
 * to a property inspector provider.  Allows an owner widget
 * to set the property inspector content for itself.
 */
export interface IPropertyInspector extends IDisposable {
  /*
   * Render the property inspector content.
   *
   * If the owner widget is not the most recently focused,
   * The content will not be shown until that widget
   * is focused.
   *
   * @param content - the widget or react element to render.
   */
  render(content: Widget | React.ReactElement): void;

  /**
   * Show the property inspector panel.
   *
   * If the owner widget is not the most recently focused,
   * this is a no-op.  It should be triggered by a user
   * action.
   */
  showPanel(): void;
}

/**
 * A provider for property inspectors.
 */
export interface IPropertyInspectorProvider {
  /**
   * Register a widget in the property inspector provider.
   *
   * @param widget The owner widget whose properties will be inspected.
   *
   * ## Notes
   * Only one property inspector can be provided for each widget.
   * Registering the same widget twice will result in an error.
   * A widget can be unregistered by disposing of its property
   * inspector.
   */
  register(widget: Widget): IPropertyInspector;
}

/**
 * The property inspector provider token.
 */
export const IPropertyInspectorProvider = new Token<IPropertyInspectorProvider>(
  '@jupyterlab/property-inspector:IPropertyInspectorProvider',
  'A service to register new widgets in the property inspector side panel.'
);
