/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Token } from '@lumino/coreutils';

export namespace FormComponentRegistry {
  export interface IRendererProps {
    value: any;
    handleChange: (newValue: any) => void;
    uihints?: any;
  }
}

export class FormComponentRegistry implements IFormComponentRegistry {
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
}

export const IFormComponentRegistry = new Token<IFormComponentRegistry>(
  '@jupyterlab/settingeditor:ISettingEditorRegistry'
);
