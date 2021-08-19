export namespace SettingEditorRegistry {
  export interface IRendererProps {
    value: any;
    handleChange: (newValue: any) => void;
    uihints?: any;
  }
}

export class SettingEditorRegistry {
  addRenderer(
    id: string,
    renderer: (props: SettingEditorRegistry.IRendererProps) => any
  ): boolean {
    if (this._renderers[id]) {
      return false;
    }
    this._renderers[id] = renderer;
    return true;
  }

  getRenderer(
    id: string
  ): (props: SettingEditorRegistry.IRendererProps) => any {
    return this._renderers[id];
  }

  private _renderers: { [id: string]: (props: any) => any } = {};
}
