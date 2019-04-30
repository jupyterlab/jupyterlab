// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import HTML5Svg from '../../style/icons/html5-icon.svg';

export function ParseSvg(svg: string): Document {
  let parser = new DOMParser();
  return parser.parseFromString(svg, 'image/svg+xml');
}

export function AttachSvg(node: HTMLElement, svg: string): Document {
  let img = ParseSvg(svg);

  node.appendChild(img);
  return img;
}

export const HTML5Icon = ParseSvg(HTML5Svg);
