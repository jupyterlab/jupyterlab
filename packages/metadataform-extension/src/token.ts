// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { Widget } from '@lumino/widgets';
import * as React from 'react';

/**
 * A metadata form interface provided when registering
 * to a metadata form provider.  Allows an owner widget
 * to set the metadata form content for itself.
 */
export interface IMetadataForm extends IDisposable {
  /*
   * Render the metadata form content.
   *
   * If the owner widget is not the most recently focused,
   * The content will not be shown until that widget
   * is focused.
   *
   * @param content - the widget or react element to render.
   */
  render(content: Widget | React.ReactElement): void;
}

/**
 * A provider for metadata form.
 */
export interface IMetadataFormProvider {
  /**
   * Register a widget in the metadata form provider.
   *
   * @param widget The owner widget whose properties will be inspected.
   *
   * ## Notes
   * Only one metadata form can be provided for each widget.
   * Registering the same widget twice will result in an error.
   * A widget can be unregistered by disposing of its metadata
   * form.
   */
  register(widget: Widget): IMetadataForm;
}

/**
 * The property inspector provider token.
 */
export const IMetadataFormProvider = new Token<IMetadataFormProvider>(
  '@jupyterlab/metadataform:IMetadataFormProvider'
);
