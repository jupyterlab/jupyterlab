// Copyright (c) Jupyter Development Team.
// Distributed under the terms o
// the Modified BSD License.

export function AttachSvg(node: HTMLElement, svg: string): Document {
  let parser = new DOMParser();
  let img = parser.parseFromString(svg, 'image/svg+xml');

  node.appendChild(img);
  return img;
}
