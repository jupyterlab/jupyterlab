// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import HTML5Svg from '../../style/icons/html5-icon.svg';
import KernelSvg from '../../style/icons/kernel-icon.svg';
import LineFormSvg from '../../style/icons/line-form-icon.svg';
import NotTrustedSvg from '../../style/icons/not-trusted-icon.svg';
import TerminalSvg from '../../style/icons/terminal-icon.svg';
import TrustedSvg from '../../style/icons/trusted-icon.svg';

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

  icon(name: string): HTMLElement {
    return Private.parseSvg(this._svgs[name]);
  }

  svg(name: string): string {
    return this._svgs[name];
  }

  attachIcon(name: string, node: HTMLElement) {
    Private.appendSvg(this._svgs[name], node);
  }

  private _svgs: { [key: string]: string } = Object.create(null);
}

export namespace IconRegistry {
  export interface IModel {
    name: string;
    svg: string;
  }

  export const defaultIcons: ReadonlyArray<IModel> = [
    { name: 'html5-icon', svg: HTML5Svg },
    { name: 'kernel', svg: KernelSvg },
    { name: 'line-form', svg: LineFormSvg },
    { name: 'not-trusted', svg: NotTrustedSvg },
    { name: 'terminal', svg: TerminalSvg },
    { name: 'trusted', svg: TrustedSvg }
  ];
}

export const defaultIconRegistry: IconRegistry = new IconRegistry();

namespace Private {
  export function parseSvg(svg: string): HTMLElement {
    let parser = new DOMParser();
    return parser.parseFromString(svg, 'image/svg+xml').documentElement;
  }

  export function appendSvg(svg: string, node: HTMLElement): void {
    node.appendChild(parseSvg(svg));
  }
}
