import {
  RenderMime
} from '@jupyterlab/rendermime';

import {
  Message,
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  JSONObject
} from '@phosphor/coreutils';

import embed = require('vega-embed');



const VEGA_CLASS = 'jp-RenderedVega';

export
class RenderedVega extends Widget {

  constructor(options: RenderMime.IRenderOptions) {
    super();
    this.addClass(VEGA_CLASS);
    this._model = options.model;
    this._mimeType = options.mimeType;
  }

  dispose(): void {
    this._model = null;
    super.dispose();
  }

  onAfterAttach(msg: Message): void {
    this._renderVega();
  }

  private _renderVega(): void {

    let data = this._model.data.get(this._mimeType) as JSONObject;
    console.log(data);

    let embedSpec = {
      mode: 'vega',
      spec: data
    };

    embed(this.node, embedSpec, (error: any, result: any): any => {
      // This is copied out for now as there is a bug in JupyterLab
      // that triggers and infinite rendering loop when this is done.
      // let imageData = result.view.toImageURL();
      // imageData = imageData.split(',')[1];
      // this._injector('image/png', imageData);
    });
  }

  private _model: RenderMime.IMimeModel = null;
  private _mimeType: string;

}


export
const mimeType: string = 'application/vnd.vega.v2+json';
