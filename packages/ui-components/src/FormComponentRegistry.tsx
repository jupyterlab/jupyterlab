/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Token } from '@lumino/coreutils';

export namespace FormComponentRegistry {
  /**
   * Props to pass to renderers in the component registry
   */
  export interface IRendererProps {
    // The current value of the component
    value: any;

    // A callback for when edits are made to a component
    handleChange: (newValue: any) => void;

    // Any information needed to render a component (i.e. label, field type, etc.)
    uihints?: any;
  }
}

/**
 * A registry for rendering fields used in the FormEditor component.
 */
export class FormComponentRegistry implements IFormComponentRegistry {
  /**
   *
   * @param id - Unique ID for the given renderer.
   * @param renderer - A function that takes props and returns a rendered component
   * @returns - Whether the renderer was added successfully. False if the id is already in use.
   */
  addRenderer(
    id: string,
    renderer: (props: FormComponentRegistry.IRendererProps) => any
  ): boolean {
    if (this._renderers[id]) {
      return false;
    }
    this._renderers[id] = renderer;
    return true;
  }

  get renderers(): { [id: string]: (props: any) => any } {
    return this._renderers;
  }

  /**
   *
   * @param id - The unique id for the renderer.
   * @returns - A function that takes props and returns a rendered component.
   */
  getRenderer(
    id: string
  ): (props: FormComponentRegistry.IRendererProps) => any {
    return this._renderers[id];
  }

  private _renderers: { [id: string]: (props: any) => any } = {};
}

export interface IFormComponentRegistry {
  addRenderer: (
    id: string,
    renderer: (props: FormComponentRegistry.IRendererProps) => any
  ) => void;
  getRenderer: (
    id: string
  ) => (props: FormComponentRegistry.IRendererProps) => any;

  renderers: { [id: string]: (props: any) => any };
}

export const IFormComponentRegistry = new Token<IFormComponentRegistry>(
  '@jupyterlab/settingeditor:ISettingEditorRegistry'
);
