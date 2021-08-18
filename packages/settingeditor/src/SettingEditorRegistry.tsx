export class SettingEditorRegistry {
  addRenderer(id: string, renderer: (props: any) => any): boolean {
    if (this._renderers[id]) {
      return false;
    }
    this._renderers[id] = renderer;
    return true;
  }

  getRenderer(id: string): (props: any) => any {
    return this._renderers[id];
  }

  private _renderers: { [id: string]: (props: any) => any } = {};
}
