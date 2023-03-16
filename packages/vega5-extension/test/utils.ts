/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { RenderedVega, VEGALITE5_MIME_TYPE } from '@jupyterlab/vega5-extension';
import { JSONObject } from '@lumino/coreutils';

interface ISize {
  width: number;
  height: number;
}

export const DEFAULT_SIZE: number = 200;
export const SCALE_FACTOR_PROP: string[] = [
  'metadata',
  VEGALITE5_MIME_TYPE,
  'embed_options',
  'scaleFactor'
];

export const VEGALITE5_RENDERER = new RenderedVega({
  latexTypesetter: null,
  linkHandler: null,
  mimeType: VEGALITE5_MIME_TYPE,
  resolver: null,
  sanitizer: {
    sanitize: (s: string) => s
  }
});

export const VEGALITE5_SPEC: JSONObject = {
  $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
  description: 'A simple bar chart with embedded data.',
  width: DEFAULT_SIZE,
  height: DEFAULT_SIZE,
  autosize: {
    type: 'fit',
    contains: 'padding'
  },
  data: {
    values: [
      { a: 'A', b: 28 },
      { a: 'B', b: 55 },
      { a: 'C', b: 43 },
      { a: 'D', b: 91 },
      { a: 'E', b: 81 },
      { a: 'F', b: 53 },
      { a: 'G', b: 19 },
      { a: 'H', b: 87 },
      { a: 'I', b: 52 }
    ]
  },
  mark: 'bar',
  encoding: {
    x: { field: 'a', type: 'nominal', axis: { labelAngle: 0 } },
    y: { field: 'b', type: 'quantitative' }
  }
};

export const getPNGSize = (base64PNG: string): ISize => {
  const buf = Buffer.from(base64PNG, 'base64');

  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20)
  };
};
