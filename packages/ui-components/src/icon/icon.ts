// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * To add an icon to the defaultIconRegistry requires two lines of code:
 *   1. import the icon's .svg
 *   2. add a relevant entry to _defaultIcons
 */

/* tslint:disable */
import html5Svg from '../../style/icons/html5.svg';
import kernelSvg from '../../style/icons/kernel.svg';
import jupyterFaviconSvg from '../../style/icons/jupyter-favicon.svg';
import lineFormSvg from '../../style/icons/line-form.svg';
import notTrustedSvg from '../../style/icons/not-trusted.svg';
import statusBarSvg from '../../style/icons/status-bar.svg';
import terminalSvg from '../../style/icons/terminal.svg';
import trustedSvg from '../../style/icons/trusted.svg';

const _defaultIcons: ReadonlyArray<IconRegistry.IModel> = [
  { name: 'html5', svg: html5Svg },
  { name: 'kernel', svg: kernelSvg },
  { name: 'jupyter-favicon', svg: jupyterFaviconSvg },
  { name: 'line-form', svg: lineFormSvg },
  { name: 'not-trusted', svg: notTrustedSvg },
  { name: 'status-bar', svg: statusBarSvg },
  { name: 'terminal', svg: terminalSvg },
  { name: 'trusted', svg: trustedSvg }
];
/* tslint:enable */

/**
 * The icon registry class.
 */
export class IconRegistry {
  constructor(...icons: IconRegistry.IModel[]) {
    if (icons.length) {
      this.addIcon(...icons);
    } else {
      this.addIcon(..._defaultIcons);
    }
  }

  addIcon(...icons: IconRegistry.IModel[]): void {
    icons.forEach(
      (icon: IconRegistry.IModel) => (this._svgs[icon.name] = icon.svg)
    );
  }

  icon(name: string, title?: string): HTMLElement {
    if (title) {
      let svgNode = Private.parseSvg(this.svg(name));
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
      return Private.parseSvg(this.svg(name));
    }
  }

  svg(name: string): string {
    if (!(name in this._svgs)) {
      console.error(`Invalid icon name: ${name}`);
    }

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

/**
 * The defaultIconRegistry instance.
 */
export const defaultIconRegistry: IconRegistry = new IconRegistry();

export namespace IconRegistry {
  export interface IModel {
    name: string;
    svg: string;
  }

  export const defaultIcons = _defaultIcons;
}

namespace Private {
  export function parseSvg(svg: string): HTMLElement {
    let parser = new DOMParser();
    return parser.parseFromString(svg, 'image/svg+xml').documentElement;
  }
}
