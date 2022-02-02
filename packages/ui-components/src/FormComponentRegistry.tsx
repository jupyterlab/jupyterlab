/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Token } from '@lumino/coreutils';
import { Field } from '@rjsf/core';

/**
 * A registry for rendering fields used in the FormEditor component.
 */
export class FormComponentRegistry implements IFormComponentRegistry {
  /**
   * Adds a renderer for a given id - if the id is already in use, returns false.
   * Otherwise, returns true.
   * @param id - Unique ID for the given renderer.
   * @param renderer - A function that takes props and returns a rendered component
   * @returns - Whether the renderer was added successfully. False if the id is already in use.
   */
  addRenderer(id: string, renderer: Field): boolean {
    if (this._renderers[id]) {
      return false;
    }
    this._renderers[id] = renderer;
    return true;
  }

  /**
   * Returns all registered renderers in dictionary form.
   * @returns - A dictionary that maps an id to a renderer.
   */
  get renderers(): { [id: string]: Field } {
    return this._renderers;
  }

  /**
   * Returns the renderer for the given id
   * @param id - The unique id for the renderer.
   * @returns - A function that takes props and returns a rendered component.
   */
  getRenderer(id: string): Field {
    return this._renderers[id];
  }

  private _renderers: { [id: string]: Field } = {};
}

/**
 * A registry for rendering fields used in the FormEditor component.
 */
export interface IFormComponentRegistry {
  /**
   * Adds a renderer for a given id - if the id is already in use, returns false.
   * Otherwise, returns true.
   * @param id - Unique ID for the given renderer.
   * @param renderer - A function that takes props and returns a rendered component
   * @returns - Whether the renderer was added successfully. False if the id is already in use.
   */
  addRenderer: (id: string, renderer: Field) => void;

  /**
   * Returns the renderer for the given id
   * @param id - The unique id for the renderer.
   * @returns - A function that takes props and returns a rendered component.
   */
  getRenderer: (id: string) => Field;

  /**
   * Returns all registered renderers in dictionary form.
   * @returns - A dictionary that maps an id to a renderer.
   */
  renderers: { [id: string]: Field };
}

export const IFormComponentRegistry = new Token<IFormComponentRegistry>(
  '@jupyterlab/ui-components:ISettingEditorRegistry'
);
