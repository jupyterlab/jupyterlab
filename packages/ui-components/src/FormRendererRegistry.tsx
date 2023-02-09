/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { IFormRenderer, IFormRendererRegistry } from './tokens';

/**
 * A registry for property renderers used in the FormEditor component.
 */
export class FormRendererRegistry implements IFormRendererRegistry {
  /**
   * Adds a renderer for a given property of a given settings plugin.
   *
   * The id must follow that structure `<ISettingRegistry.IPlugin.id>.<propertyName>`
   *
   * @param id - Unique ID for the given renderer.
   * @param renderer - A renderer interfacing IFormRenderer.
   */
  addRenderer(id: string, renderer: IFormRenderer): void {
    if (this._renderers[id]) {
      throw new Error(`A renderer with id '${id}' is already registered.`);
    }
    if (!renderer.fieldRenderer && !renderer.widgetRenderer) {
      throw new Error(
        `The component for '${id}' cannot be registered as it does not define 'fieldRenderer' nor 'widgetRenderer'.`
      );
    }

    const splitPosition = id.lastIndexOf('.');
    const pluginId = id.substring(0, splitPosition);
    const propertyName = id.substring(splitPosition + 1);
    if (pluginId.length == 0 || propertyName.length == 0) {
      throw new Error(
        `Form renderer id must follows the structure '<ISettingRegistry.IPlugin.id>.<propertyName>'; got ${id}.`
      );
    }

    this._renderers[id] = renderer;
  }

  /**
   * Returns all registered renderers in dictionary form.
   * @returns - A dictionary that maps an id to a renderer.
   */
  get renderers(): { [id: string]: IFormRenderer } {
    return this._renderers;
  }

  /**
   * Returns the renderer for the given id
   * @param id - The unique id for the renderer.
   * @returns - A renderer interfacing IFormRenderer.
   */
  getRenderer(id: string): IFormRenderer {
    return this._renderers[id];
  }

  private _renderers: { [id: string]: IFormRenderer } = {};
}
