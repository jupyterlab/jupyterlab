import React from 'react';

import ReactDOM from 'react-dom';

import { classes } from 'typestyle';

import { iconStyle, IIconStyle } from '../style/icon';

import { getReactAttrs } from '../utils';

export class JLIcon {
  constructor(
    readonly name: string,
    readonly svgstr: string,
    readonly style: IIconStyle = {},
    protected _debug: boolean = false
  ) {}

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

  element({
    className,
    container,
    title,
    tag = 'div',
    ...propsStyle
  }: JLIcon.IProps = {}): HTMLElement | null {
    const propsStyleComb = { ...this.style, ...propsStyle };
    const classNames = classes(
      className,
      propsStyleComb ? iconStyle(propsStyleComb) : ''
    );

    // ensure that svg html is valid
    const svgElement = this.resolveSvg(title);
    if (!svgElement) {
      // bail if failing silently
      return null;
    }

    // create a container if needed
    container = container || document.createElement(tag);

    // set the container class to style class + explicitly passed className
    container.className = classNames;

    // add the svg node to the container
    container.appendChild(svgElement);

    return svgElement;
  }

  render(host: HTMLElement, props: JLIcon.IProps = {}): void {
    return ReactDOM.render(<this.react {...props} container={host} />, host);
  }

  unrender(host: HTMLElement): void {
    ReactDOM.unmountComponentAtNode(host);
  }

  bindStyle(propsStyle: IIconStyle = {}): JLIcon {
    return new JLIcon(this.name, this.svgstr, propsStyle, this._debug);
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
          container.className = classNames;

          return svgComponent;
        } else {
          return <Tag className={classNames}>{svgComponent}</Tag>;
        }
      }
    );

    component.displayName = `JLIcon_${this.name}`;
    return component;
  }

  // NB: this._initReact() will be run after the property initializers
  // defined by the constructor signature, but before the constructor body
  readonly react = this._initReact();
}

/**
 * A namespace for JLIcon statics.
 */
export namespace JLIcon {
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
