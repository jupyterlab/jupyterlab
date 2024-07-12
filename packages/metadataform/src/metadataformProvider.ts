/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { IMetadataFormProvider, MetadataForm } from './token';

export class MetadataFormProvider implements IMetadataFormProvider {
  add(id: string, widget: MetadataForm.IMetadataForm) {
    if (!this._items[id]) {
      this._items[id] = widget;
    } else {
      console.warn(`A MetadataformWidget is already registered with id ${id}`);
    }
  }

  get(id: string): MetadataForm.IMetadataForm | undefined {
    if (this._items[id]) {
      return this._items[id];
    } else {
      console.warn(`There is no MetadataformWidget registered with id ${id}`);
    }
  }

  _items: { [id: string]: MetadataForm.IMetadataForm } = {};
}
