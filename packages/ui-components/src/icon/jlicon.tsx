import React, { RefObject } from 'react';
import { classes } from 'typestyle';
import { iconStyle, IIconStyle } from '../style/icon';

export class JLIcon {
  constructor(
    readonly name: string,
    readonly svgstr: string,
    protected _debug: boolean = false
  ) {}

  resolveSvg(title?: string): HTMLElement | null {
    const svgElement = new DOMParser().parseFromString(
      this.svgstr,
      'image/svg+xml'
    ).documentElement;

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
    title,
    tag = 'div',
    ...propsStyle
  }: JLIcon.IProps): HTMLElement | null {
    const classNames = classes(
      className,
      propsStyle ? iconStyle(propsStyle) : ''
    );

    // ensure that svg html is valid
    const svgElement = this.resolveSvg(title);
    if (!svgElement) {
      // bail if failing silently
      return null;
    }

    const container = document.createElement(tag);
    container.appendChild(svgElement);
    container.className = classNames;
    return container;
  }

  protected _initReact() {
    const component = React.forwardRef(
      (
        { className, title, tag = 'div', ...propsStyle }: JLIcon.IProps,
        ref: RefObject<HTMLDivElement>
      ) => {
        const Tag = tag;
        const classNames = classes(
          className,
          propsStyle ? iconStyle(propsStyle) : ''
        );

        // ensure that svg html is valid
        const svgElement = this.resolveSvg(title);
        if (!svgElement) {
          // bail if failing silently
          return <></>;
        }

        return (
          <Tag
            className={classNames}
            dangerouslySetInnerHTML={{ __html: svgElement.outerHTML }}
            ref={ref}
          />
        );
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
     * Extra classNames, used in addition to the typestyle className
     */
    className?: string;

    tag?: 'div' | 'span';

    /**
     * Icon title
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
