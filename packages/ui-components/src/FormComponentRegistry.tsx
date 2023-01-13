/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Token } from '@lumino/coreutils';
import type { Field, Widget } from '@rjsf/core';

/**
 * A registry for rendering fields used in the FormEditor component.
 */
export class FormComponentRegistry implements IFormComponentRegistry {
  /**
   * Adds a component for a given id - if the id is already in use, returns false.
   * Otherwise, returns true.
   * @param id - Unique ID for the given component.
   * @param component - A component interfacing IFormComponent.
   * @returns - Whether the renderer was added successfully. False if the id is already in use.
   */
  addComponent(id: string, component: IFormComponent): boolean {
    if (this._components[id]) {
      console.warn(`A component with id '${id} is already registered.`);
      return false;
    }
    if (!component.fieldRenderer && !component.widgetRenderer) {
      console.warn(
        "A component to register must define a 'fieldRenderer' or a 'widgetRenderer'."
      );
      return false;
    }
    this._components[id] = component;
    return true;
  }

  /**
   * Returns all registered components in dictionary form.
   * @returns - A dictionary that maps an id to a component.
   */
  get components(): { [id: string]: IFormComponent } {
    return this._components;
  }

  /**
   * Returns the component for the given id
   * @param id - The unique id for the component.
   * @returns - A component interfacing IFormComponent.
   */
  getComponent(id: string): IFormComponent {
    return this._components[id];
  }

  private _components: { [id: string]: IFormComponent } = {};
}

/**
 * A registry for rendering fields used in the FormEditor component.
 */
export interface IFormComponentRegistry {
  /**
   * Adds a component for a given id - if the id is already in use, returns false.
   * Otherwise, returns true.
   * @param id - Unique ID for the given component.
   * @param component - A component interfacing IFormComponent.
   * @returns - Whether the renderer was added successfully. False if the id is already in use.
   */
  addComponent: (id: string, renderer: IFormComponent) => void;

  /**
   * Returns the component for the given id
   * @param id - The unique id for the component.
   * @returns - A component interfacing IFormComponent.
   */
  getComponent: (id: string) => IFormComponent;

  /**
   * Returns all registered components in dictionary form.
   * @returns - A dictionary that maps an id to a component.
   */
  components: { [id: string]: IFormComponent };
}

/**
 * Form component interface.
 */
export interface IFormComponent {
  /**
   * A function that takes FieldProps and returns a rendered field.
   */
  fieldRenderer?: Field;

  /**
   * A function that takes WidgetProps and returns a rendered widget.
   */
  widgetRenderer?: Widget;
}

/**
 * The token for the form component registry.
 */
export const IFormComponentRegistry = new Token<IFormComponentRegistry>(
  '@jupyterlab/ui-components:IFormComponentRegistry'
);
