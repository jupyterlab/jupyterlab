/**
 * Provides a way to render dataset mimetypes, with a way to register them in the data registry.
 */
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import * as React from 'react';
import { JSONValue } from '@phosphor/coreutils';
import { ReactWidget } from '@jupyterlab/apputils';
import { Dataset } from './dataregistry';

// Needs to end in +json or else can't be JSON data
// https://github.com/jupyter/nbformat/blob/9dd1b8719c9095eaebce1846416bb3a5e939758f/nbformat/v4/nbformat.v4.schema.json#L407
const datasetMimeType = 'application/x.jupyter.dataset+json';

type DatasetMimeData = Array<{
  mimeType: string;
  url: string;
  data: JSONValue;
}>;
type Register = (datasets: Array<Dataset<any>>) => Promise<void>;
class RendererDataset extends ReactWidget implements IRenderMime.IRenderer {
  constructor(private _register: Register) {
    super();
  }

  render() {
    return (
      <button onClick={() => this._register(this._datasets)}>
        Register datasets
      </button>
    );
  }
  async renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    this._datasets = [];
    for (const { mimeType, url, data } of model.data[
      datasetMimeType
    ] as DatasetMimeData) {
      this._datasets.push(new Dataset(mimeType, new URL(url), data));
    }
  }
  private _datasets: Array<Dataset<any>> = [];
}

export function createRenderMimeFactory(
  register: Register
): IRenderMime.IRendererFactory {
  return {
    safe: true,
    defaultRank: 50,
    mimeTypes: [datasetMimeType],
    createRenderer: options => new RendererDataset(register)
  };
}
