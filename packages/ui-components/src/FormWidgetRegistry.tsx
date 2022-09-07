/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Token } from '@lumino/coreutils';
import type { Widget } from '@rjsf/core';

/**
 * A registry for rendering widget ( used in the metadataform-extension).
 */
export class FormWidgetRegistry implements IFormWidgetRegistry {
  /**
   * Adds a formWidget for a given id - if the id is already in use, returns false.
   * Otherwise, returns true.
   * @param id - Unique ID for the given renderer.
   * @param formWidget - The formWidget to add.
   * @returns - Whether the formWidget was added successfully. False if the id is already in use.
   */
  addFormWidget(id: string, formWidget: IFormWidget): boolean {
    if (this._formWidgets[id]) {
      return false;
    }
    this._formWidgets[id] = formWidget;
    return true;
  }

  /**
   * Returns the formWidget for the given id
   * @param id - The unique id for the formWidget.
   * @returns - A function that takes props and returns a formWidget containing a rendered component.
   */
  getFormWidgets(id: string): IFormWidget {
    return this._formWidgets[id];
  }

  /**
   * Returns all registered formWidgets in dictionary form.
   * @returns - A dictionary that maps an id to a formWidget.
   */
  get formWidgets(): { [id: string]: IFormWidget } {
    return this._formWidgets;
  }

  private _formWidgets: { [id: string]: IFormWidget } = {};
}

/**
 * A registry for rendering formWidgets ( used in the metadataform-extension).
 */
export interface IFormWidgetRegistry {
  /**
   * Adds a formWidget for a given id - if the id is already in use, returns false.
   * Otherwise, returns true.
   * @param id - Unique ID for the given renderer.
   * @param formWidget - The formWidget to add.
   * @returns - Whether the formWidget was added successfully. False if the id is already in use.
   */
  addFormWidget: (id: string, formWidget: IFormWidget) => void;

  /**
   * Returns the formWidget for the given id
   * @param id - The unique id for the formWidget.
   * @returns - A function that takes props and returns a formWidget containing a rendered component.
   */
  getFormWidgets: (id: string) => IFormWidget;

  /**
   * Returns all registered formWidgets in dictionary form.
   * @returns - A dictionary that maps an id to a formWidget.
   */
  formWidgets: { [id: string]: IFormWidget };
}

/**
 * The form widget interface.
 */
export interface IFormWidget {
  /**
   *A function that takes props and returns a rendered component.
   */
  renderer: Widget;
}

/**
 * The token of the registry.
 */
export const IFormWidgetRegistry = new Token<IFormWidgetRegistry>(
  '@jupyterlab/ui-components:IFormWidgetRegistry'
);
