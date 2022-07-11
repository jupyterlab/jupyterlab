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
   * Adds a renderer for a given id - if the id is already in use, returns false.
   * Otherwise, returns true.
   * @param id - Unique ID for the given renderer.
   * @param renderer - A function that takes props and returns a rendered component
   * @returns - Whether the renderer was added successfully. False if the id is already in use.
   */
  addRenderer(id: string, renderer: Widget): boolean {
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
  get renderers(): { [id: string]: Widget } {
    return this._renderers;
  }

  /**
   * Returns the renderer for the given id
   * @param id - The unique id for the renderer.
   * @returns - A function that takes props and returns a rendered component.
   */
  getRenderer(id: string): Widget {
    return this._renderers[id];
  }

  private _renderers: { [id: string]: Widget } = {};
}

/**
 *  registry for rendering widget ( used in the metadataform-extension).
 */
export interface IFormWidgetRegistry {
  /**
   * Adds a renderer for a given id - if the id is already in use, returns false.
   * Otherwise, returns true.
   * @param id - Unique ID for the given renderer.
   * @param renderer - A function that takes props and returns a rendered component
   * @returns - Whether the renderer was added successfully. False if the id is already in use.
   */
  addRenderer: (id: string, renderer: Widget) => void;

  /**
   * Returns the renderer for the given id
   * @param id - The unique id for the renderer.
   * @returns - A function that takes props and returns a rendered component.
   */
  getRenderer: (id: string) => Widget;

  /**
   * Returns all registered renderers in dictionary form.
   * @returns - A dictionary that maps an id to a renderer.
   */
  renderers: { [id: string]: Widget };
}

export const IFormWidgetRegistry = new Token<IFormWidgetRegistry>(
  '@jupyterlab/ui-components:IFormWidgetRegistry'
);
