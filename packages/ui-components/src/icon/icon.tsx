// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React from 'react';
import { classes } from 'typestyle/lib';

import { IIconStyle, iconStyle, iconStyleFlat } from '../style/icon';

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

  svg(name: string): string {
    if (!(name in this._svgs)) {
      console.error(`Invalid icon name: ${name}`);
    }

    return this._svgs[name];
  }

  /**
   * Get the icon as an HTMLElement of tag <svg><svg/>
   */
  icon(
    props: IconRegistry.IIconOptions & { container: HTMLElement } & IIconStyle
  ): HTMLElement {
    const { name, className, title, container, ...propsStyle } = props;
    let svgNode = Private.parseSvg(this.svg(name));

    if (title) {
      Private.setTitleSvg(svgNode, title);
    }

    if (container) {
      // clear any existing icon in container (and all other child elements)
      container.textContent = '';
      container.appendChild(svgNode);

      // add icon styling class to the container, if not already present
      let classNames = classes(
        className,
        propsStyle ? iconStyle(propsStyle) : ''
      );
      if (!container.className.includes(classNames)) {
        container.className = classes(container.className, classNames);
      }
    } else {
      // add icon styling class directly to the svg node
      svgNode.setAttribute(
        'class',
        classes(className, propsStyle ? iconStyleFlat(propsStyle) : '')
      );
    }

    return svgNode;
  }

  /**
   * Get the icon as a ReactElement of tag <tag><svg><svg/><tag/>
   * TODO: figure out how to remove the unnecessary outer <tag>
   */
  iconReact(
    props: IconRegistry.IIconOptions & { tag?: 'div' | 'span' } & IIconStyle
  ): React.ReactElement {
    const { name, className, title, tag, ...propsStyle } = props;
    const Tag = tag || 'div';

    return (
      <Tag
        className={classes(className, propsStyle ? iconStyle(propsStyle) : '')}
        dangerouslySetInnerHTML={{ __html: this.svg(name) }}
      />
    );
  }

  private _svgs: { [key: string]: string } = Object.create(null);
}

/**
 * The defaultIconRegistry instance.
 */
export const defaultIconRegistry: IconRegistry = new IconRegistry();

/**
 * Alias for defaultIconRegistry.iconReact that can be used as a React component
 */
export const IconReact = (
  props: IconRegistry.IIconOptions & { tag?: 'div' | 'span' } & IIconStyle
): React.ReactElement => {
  return defaultIconRegistry.iconReact(props);
};

export namespace IconRegistry {
  export interface IModel {
    name: string;
    svg: string;
  }

  export interface IIconOptions {
    name: string;
    className?: string;
    title?: string;
  }

  export const defaultIcons = _defaultIcons;
}

namespace Private {
  export function parseSvg(svg: string): HTMLElement {
    let parser = new DOMParser();
    return parser.parseFromString(svg, 'image/svg+xml').documentElement;
  }

  export function setTitleSvg(svgNode: HTMLElement, title: string): void {
    // add a title node to the top level svg node
    let titleNodes = svgNode.getElementsByTagName('title');
    if (titleNodes) {
      titleNodes[0].textContent = title;
    } else {
      let titleNode = document.createElement('title');
      titleNode.textContent = title;
      svgNode.appendChild(titleNode);
    }
  }
}
