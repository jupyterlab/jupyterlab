// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import html5Svg from '../../style/icons/html5-icon.svg';
import kernelSvg from '../../style/icons/kernel-icon.svg';
import lineFormSvg from '../../style/icons/line-form-icon.svg';
import notTrustedSvg from '../../style/icons/not-trusted-icon.svg';
import terminalSvg from '../../style/icons/terminal-icon.svg';
import trustedSvg from '../../style/icons/trusted-icon.svg';

/**
 * The icon registry.
 */
export class IconRegistry {
  constructor(...icons: IconRegistry.IModel[]) {
    if (icons.length) {
      this.addIcon(...icons);
    } else {
      this.addIcon(...IconRegistry.defaultIcons);
    }
  }

  addIcon(...icons: IconRegistry.IModel[]): void {
    icons.forEach(
      (icon: IconRegistry.IModel) => (this._svgs[icon.name] = icon.svg)
    );
  }

  icon(name: string, title?: string): HTMLElement {
    if (!this._svgs[name]) {
      console.warn(`Invalid icon name: ${name}`);
    }

    if (title) {
      let svgNode = Private.parseSvg(this._svgs[name]);
      let titleNodes = svgNode.getElementsByTagName('title');
      if (titleNodes) {
        titleNodes[0].textContent = title;
      } else {
        let titleNode = document.createElement('title');
        titleNode.textContent = title;
        svgNode.appendChild(titleNode);
      }
      return svgNode;
    } else {
      return Private.parseSvg(this._svgs[name]);
    }
  }

  svg(name: string): string {
    return this._svgs[name];
  }

  attachIcon(node: HTMLElement, name: string, title?: string): void {
    node.appendChild(this.icon(name, title));
  }

  setIcon(node: HTMLElement, name: string, title?: string): void {
    // clear any existing icon (and all other child elements)
    node.textContent = '';
    this.attachIcon(node, name, title);
  }

  private _svgs: { [key: string]: string } = Object.create(null);
}

export namespace IconRegistry {
  export interface IModel {
    name: string;
    svg: string;
  }

  export const defaultIcons: ReadonlyArray<IModel> = [
    { name: 'html5', svg: html5Svg },
    { name: 'kernel', svg: kernelSvg },
    { name: 'line-form', svg: lineFormSvg },
    { name: 'not-trusted', svg: notTrustedSvg },
    { name: 'terminal', svg: terminalSvg },
    { name: 'trusted', svg: trustedSvg }
  ];
}

export const defaultIconRegistry: IconRegistry = new IconRegistry();

namespace Private {
  export function parseSvg(svg: string): HTMLElement {
    let parser = new DOMParser();
    return parser.parseFromString(svg, 'image/svg+xml').documentElement;
  }
}
