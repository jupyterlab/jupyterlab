// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React from 'react';
import { classes } from 'typestyle/lib';

import { camelize } from '../utils';
import { IIconStyle, iconStyle, iconStyleFlat } from '../style/icon';

/**
 * To add an icon to the defaultIconRegistry requires two lines of code:
 *   1. import the icon's .svg
 *   2. add a relevant entry to _defaultIcons
 */

/* tslint:disable */
import badSvg from '../../style/icons/bad.svg';
import jupyterFaviconSvg from '../../style/icons/jupyter-favicon.svg';

// filetype icons
import html5Svg from '../../style/icons/filetype/html5.svg';

// statusbar icons
import kernelSvg from '../../style/icons/statusbar/kernel.svg';
import lineFormSvg from '../../style/icons/statusbar/line-form.svg';
import notTrustedSvg from '../../style/icons/statusbar/not-trusted.svg';
import statusBarSvg from '../../style/icons/statusbar/status-bar.svg';
import terminalSvg from '../../style/icons/statusbar/terminal.svg';
import trustedSvg from '../../style/icons/statusbar/trusted.svg';

// sidebar icons
import buildSvg from '../../style/icons/sidebar/build.svg'; // originally ic-build-24px.svg
import extensionSvg from '../../style/icons/sidebar/extension.svg'; // originally ic-extension-24px.svg
import folderSvg from '../../style/icons/sidebar/folder.svg'; // originally ic-folder-24px.svg
import paletteSvg from '../../style/icons/sidebar/palette.svg'; // originally ic-palette-24px.svg
import runningSvg from '../../style/icons/sidebar/running.svg'; // originally stop-circle.svg
import tabSvg from '../../style/icons/sidebar/tab.svg'; // originally ic-tab-24px.svg

const _defaultIcons: ReadonlyArray<IconRegistry.IModel> = [
  { name: 'jupyter-favicon', svg: jupyterFaviconSvg },

  { name: 'html5', svg: html5Svg },

  { name: 'kernel', svg: kernelSvg },
  { name: 'line-form', svg: lineFormSvg },
  { name: 'not-trusted', svg: notTrustedSvg },
  { name: 'status-bar', svg: statusBarSvg },
  { name: 'terminal', svg: terminalSvg },
  { name: 'trusted', svg: trustedSvg },

  { name: 'build', svg: buildSvg },
  { name: 'extension', svg: extensionSvg },
  { name: 'folder', svg: folderSvg },
  { name: 'palette', svg: paletteSvg },
  { name: 'running', svg: runningSvg },
  { name: 'tab', svg: tabSvg }
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

    // add the bad state icon
    this.addIcon({ name: 'bad', svg: badSvg });
  }

  addIcon(...icons: IconRegistry.IModel[]): void {
    icons.forEach((icon: IconRegistry.IModel) => {
      let className = icon.className
        ? icon.className
        : IconRegistry.iconClassName(icon.name);
      this._classNameToName[className] = icon.name;
      this._nameToClassName[icon.name] = className;
      this._svg[icon.name] = icon.svg;
    });
  }

  resolveName(name: string): string {
    if (!(name in this._svg)) {
      // assume name is really a className, split the className into parts and check each part
      for (let className of name.split(/\s+/)) {
        if (className in this._classNameToName) {
          return this._nameToClassName[className];
        }
      }
      // couldn't resolve name, mark as bad
      return 'bad';
    }

    return name;
  }

  /**
   * Get the icon as an HTMLElement of tag <svg><svg/>
   */
  icon(
    props: IconRegistry.IIconOptions & { container: HTMLElement } & IIconStyle
  ): HTMLElement {
    const { name, className, title, skipbad, container, ...propsStyle } = props;

    // if name not in _svg, assume we've been handed a className in place of name
    let svg = this.svg(name, skipbad);
    if (!svg) {
      // bail
      return;
    }

    let svgNode = Private.parseSvg(svg);

    if (title) {
      Private.setTitleSvg(svgNode, title);
    }

    if (container) {
      // clear any existing icon in container (and all other child elements)
      container.textContent = '';
      container.appendChild(svgNode);

      let styleClass = propsStyle ? iconStyle(propsStyle) : '';
      if (className) {
        // override the className, if explicitly passed
        container.className = classes(className, styleClass);
      } else if (!(styleClass in container.classList)) {
        // add icon styling class to the container's class, if not already present
        container.className = classes(container.className, styleClass);
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
    const { name, className, title, skipbad, tag, ...propsStyle } = props;
    const Tag = tag || 'div';

    let svg = this.svg(name, skipbad);
    if (!svg) {
      // bail
      return;
    }

    return (
      <Tag
        className={classes(className, propsStyle ? iconStyle(propsStyle) : '')}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  // override(
  //   props: { className: string; name?: string; title?: string } & IIconStyle
  // ) {
  //   let { name, className, title, ...propsStyle } = props;
  //
  //   // try to resolve name
  //   name = name ? name : this.classNameToName(className);
  //   if (!name) {
  //     // bail
  //     return;
  //   }
  //
  //   for (let container of document.getElementsByClassName(
  //     className
  //   ) as HTMLCollectionOf<HTMLElement>) {
  //     this.icon({
  //       name: name,
  //       title: title,
  //       container: container,
  //       ...propsStyle
  //     });
  //   }
  // }

  svg(name: string, skipbad: boolean = false): string {
    let svgname = this.resolveName(name);

    if (name === 'bad') {
      if (!skipbad) {
        // log a warning and mark missing icons with an X
        console.error(`Invalid icon name: ${name}`);
      } else {
        // silently return empty string
        return '';
      }
    }

    return this._svg[svgname];
  }

  static iconClassName(name: string): string {
    return 'jp-' + camelize(name, true) + 'Icon';
  }

  private _classNameToName: { [key: string]: string } = Object.create(null);
  private _nameToClassName: { [key: string]: string } = Object.create(null);
  private _svg: { [key: string]: string } = Object.create(null);
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
    className?: string;
    svg: string;
  }

  export interface IIconOptions {
    name: string;
    className?: string;
    title?: string;
    skipbad?: boolean;
  }

  // needs the explicit type to avoid a typedoc issue
  export const defaultIcons: ReadonlyArray<IconRegistry.IModel> = _defaultIcons;
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
