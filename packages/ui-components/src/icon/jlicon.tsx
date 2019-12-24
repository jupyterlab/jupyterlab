// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React from 'react';
import ReactDOM from 'react-dom';
import { classes } from 'typestyle';

import { iconStyle, IIconStyle } from '../style/icon';
import { getReactAttrs } from '../utils';
import { Text } from '@jupyterlab/coreutils';

export class JLIcon {
  constructor({ name, svgstr, _debug = false }: JLIcon.IOptions) {
    this.name = name;
    this.svgstr = svgstr;

    this._className = 'jp-' + Text.camelCase(name, true) + 'Icon';
    this._debug = _debug;

    this.react = this._initReact();
  }

  className({
    className,
    ...propsStyle
  }: { className?: string } & IIconStyle = {}): string {
    if (!className) {
      className = this._className;
    }

    return classes(className, iconStyle(propsStyle));
  }

  element({
    className,
    container,
    title,
    tag = 'div',
    ...propsStyle
  }: JLIcon.IProps = {}): HTMLElement | null {
    // ensure that svg html is valid
    const svgElement = this.resolveSvg(title);
    if (!svgElement) {
      // bail if failing silently
      return null;
    }

    // create a container if needed
    container = container || document.createElement(tag);

    // set the container class to style class + explicitly passed className
    container.classList.add(...(classNames ? classNames : []));

    // add the svg node to the container
    container.appendChild(svgElement);

    return svgElement;
  }

  render(host: HTMLElement, props: JLIcon.IProps = {}): void {
    return ReactDOM.render(<this.react {...props} />, host);
  }

  resolveSvg(title?: string): HTMLElement | null {
    const svgDoc = new DOMParser().parseFromString(
      this.svgstr,
      'image/svg+xml'
    );
    const svgElement = svgDoc.documentElement;

    if (svgElement.getElementsByTagName('parsererror').length > 0) {
      const errmsg = `SVG HTML was malformed for icon name: ${name}`;
      // parse failed, svgElement will be an error box
      if (this._debug) {
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

  unrender(host: HTMLElement): void {
    ReactDOM.unmountComponentAtNode(host);
  }

  style(props: IIconStyle) {
    return iconStyle(props);
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
        const propsStyleComb = { ...this.style, ...propsStyle };
        const classNames = classes(
          className,
          propsStyleComb ? iconStyle(propsStyleComb) : ''
        );

        // ensure that svg html is valid
        const svgElement = this.resolveSvg(title);
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
          container.classList.add(
            ...(classNames ? classNames.split(/\s+/) : [])
          );

          return svgComponent;
        } else {
          return (
            <Tag
              className={classes(
                className,
                propsStyleComb ? iconStyle(propsStyleComb) : ''
              )}
            >
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
  readonly svgstr: string;

  protected _className: string;
  protected _debug: boolean;
  protected _svgs: { [key: string]: string } = Object.create(null);
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
    style?: IIconStyle;
    _debug?: boolean;
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

    container?: HTMLElement;
    /**
     * HTML element tag of the icon's outermost node, which acts as a
     * container for the actual svg node
     */
    tag?: 'div' | 'span';

    /**
     * Optional title that will be set on the icon's svg node
     */
    title?: string;
  }
}

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
