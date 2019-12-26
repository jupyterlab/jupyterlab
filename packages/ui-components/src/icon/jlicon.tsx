// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React from 'react';
import ReactDOM from 'react-dom';

import { Text } from '@jupyterlab/coreutils';

import { iconStyle, IIconStyle } from '../style/icon';
import { getReactAttrs, classes, classesDedupe } from '../utils';

import badSvg from '../../style/debug/bad.svg';
import blankSvg from '../../style/debug/blank.svg';

export class JLIcon {
  private static _instances = new Map<string, JLIcon>();
  private static _debug: boolean = false;

  /**
   * Get any existing JLIcon instance by name
   *
   * @param name - Name of the JLIcon instance to fetch
   *
   * @param fallback - Optional default JLIcon instance to use if
   * name is not found
   *
   * @returns A JLIcon instance
   */
  static get(name: string, fallback?: JLIcon): JLIcon {
    const icon = JLIcon._instances.get(name);

    if (icon) {
      return icon;
    } else {
      if (JLIcon._debug) {
        // fail noisily
        console.error(`Invalid icon name: ${name}`);
        return badIcon;
      }

      // fail silently
      return fallback ?? blankIcon;
    }
  }

  /**
   * Toggle icon debug from off-to-on, or vice-versa
   *
   * @param debug - Optional boolean to force debug on or off
   */
  static toggleDebug(debug?: boolean) {
    JLIcon._debug = debug ?? !JLIcon._debug;
  }

  constructor({ name, svgstr }: JLIcon.IOptions) {
    this.name = name;
    this._className = JLIcon.nameToClassName(name);
    this._svgstr = svgstr;

    this.react = this._initReact();

    JLIcon._instances.set(this.name, this);
    JLIcon._instances.set(this._className, this);
  }

  class({ className, ...propsStyle }: { className?: string } & IIconStyle) {
    return classesDedupe(className, iconStyle(propsStyle));
  }

  element({
    className,
    container,
    title,
    tag = 'div',
    ...propsStyle
  }: JLIcon.IProps = {}): HTMLElement | null {
    // ensure that svg html is valid
    const svgElement = this.resolveSvg();
    if (!svgElement) {
      // bail if failing silently
      return null;
    }

    // create a container if needed
    container = container || document.createElement(tag);

    this._initContainer({ container, className, propsStyle, title });

    // add the svg node to the container
    container.appendChild(svgElement);

    return svgElement;
  }

  replaceSvg(svgstr: string) {
    this._svgstr = svgstr;
  }

  render(host: HTMLElement, props: JLIcon.IProps = {}): void {
    return ReactDOM.render(<this.react container={host} {...props} />, host);
  }

  resolveSvg(title?: string): HTMLElement | null {
    const svgDoc = new DOMParser().parseFromString(
      this._svgstr,
      'image/svg+xml'
    );
    const svgElement = svgDoc.documentElement;

    if (svgElement.getElementsByTagName('parsererror').length > 0) {
      const errmsg = `SVG HTML was malformed for icon name: ${name}`;
      // parse failed, svgElement will be an error box
      if (JLIcon._debug) {
        // fail noisily, render the error box
        console.error(errmsg);
        return svgElement;
      } else {
        // bad svg is always a real error, fail silently but warn
        console.warn(errmsg);
        return null;
      }
    } else {
      // parse succeeded
      if (title) {
        Private.setTitleSvg(svgElement, title);
      }

      return svgElement;
    }
  }

  string() {
    return this._svgstr;
  }

  unrender(host: HTMLElement): void {
    ReactDOM.unmountComponentAtNode(host);
  }

  protected _initContainer({
    container,
    className,
    propsStyle,
    title
  }: {
    container: HTMLElement;
    className?: string;
    propsStyle?: IIconStyle;
    title?: string;
  }) {
    const classStyle = iconStyle(propsStyle);

    if (className || className === '') {
      // override the container class with explicitly passed-in class + style class
      container.className = classes(className, classStyle);
    } else if (classStyle) {
      // add the style class to the container class
      container.classList.add(classStyle);
    }

    if (title) {
      container.title = title;
    }
  }

  protected _initReact() {
    const component = React.forwardRef(
      (
        {
          className,
          container,
          title,
          tag = 'div',
          ...propsStyle
        }: JLIcon.IProps = {},
        ref: React.RefObject<SVGElement>
      ) => {
        const Tag = tag;

        // ensure that svg html is valid
        const svgElement = this.resolveSvg();
        if (!svgElement) {
          // bail if failing silently
          return <></>;
        }

        const svgComponent = (
          <svg
            {...getReactAttrs(svgElement)}
            dangerouslySetInnerHTML={{ __html: svgElement.innerHTML }}
            ref={ref}
          />
        );

        if (container) {
          this._initContainer({ container, className, propsStyle, title });

          return svgComponent;
        } else {
          return (
            <Tag className={classes(className, iconStyle(propsStyle))}>
              {svgComponent}
            </Tag>
          );
        }
      }
    );

    component.displayName = `JLIcon_${this.name}`;
    return component;
  }

  readonly name: string;
  readonly react: React.ForwardRefExoticComponent<
    JLIcon.IProps & React.RefAttributes<SVGElement>
  >;

  protected _className: string;
  protected _svgstr: string;
}

/**
 * A namespace for JLIcon statics.
 */
export namespace JLIcon {
  /**
   * The type of the JLIcon contructor params
   */
  export interface IOptions {
    name: string;
    svgstr: string;
  }

  /**
   * The input props for creating a new JLIcon
   */
  export interface IProps extends IIconStyle {
    /**
     * Extra classNames. Used in addition to the typestyle className to
     * set the className of the icon's outermost container node
     */
    className?: string;

    /**
     * The icon's outermost node, which acts as a container for the actual
     * svg node. If container is not supplied, it will be created
     */
    container?: HTMLElement;

    /**
     * HTML element tag used to create the icon's outermost container node,
     * if no container is passed in
     */
    tag?: 'div' | 'span';

    /**
     * Optional title that will be set on the icon's svg node
     */
    title?: string;
  }

  export function nameToClassName(name: string): string {
    return 'jp-' + Text.camelCase(name, true) + 'Icon';
  }
}

export const badIcon = new JLIcon({ name: 'bad', svgstr: badSvg });
export const blankIcon = new JLIcon({ name: 'blank', svgstr: blankSvg });

namespace Private {
  export function setTitleSvg(svgNode: HTMLElement, title: string): void {
    // add a title node to the top level svg node
    let titleNodes = svgNode.getElementsByTagName('title');
    if (titleNodes.length) {
      titleNodes[0].textContent = title;
    } else {
      let titleNode = document.createElement('title');
      titleNode.textContent = title;
      svgNode.appendChild(titleNode);
    }
  }
}
