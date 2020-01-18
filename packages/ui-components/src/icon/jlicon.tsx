// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { UUID } from '@lumino/coreutils';
import React from 'react';

import { Text } from '@jupyterlab/coreutils';

import { iconStyle, IIconStyle } from '../style/icon';
import { getReactAttrs, classes, classesDedupe } from '../utils';

import badSvg from '../../style/debug/bad.svg';
import blankSvg from '../../style/debug/blank.svg';

export class JLIcon implements JLIcon.IJLIcon {
  private static _debug: boolean = false;
  private static _instances = new Map<string, JLIcon>();

  /**
   * Get any existing JLIcon instance by name.
   *
   * @param name - name of the JLIcon instance to fetch
   *
   * @param fallback - optional default JLIcon instance to use if
   * name is not found
   *
   * @returns A JLIcon instance
   */
  private static _get(name: string, fallback?: JLIcon): JLIcon | undefined {
    for (let className of name.split(/\s+/)) {
      if (JLIcon._instances.has(className)) {
        return JLIcon._instances.get(className);
      }
    }

    // lookup failed
    if (JLIcon._debug) {
      // fail noisily
      console.error(`Invalid icon name: ${name}`);
      return badIcon;
    }

    // fail silently
    return fallback;
  }

  /**
   * Get any existing JLIcon instance by name, construct a DOM element
   * from it, then return said element.
   *
   * @param name - name of the JLIcon instance to fetch
   *
   * @param fallback - if left undefined, use automatic fallback to
   * icons-as-css-background behavior: elem will be constructed using
   * a blank icon with `elem.className = classes(name, props.className)`,
   * where elem is the return value. Otherwise, fallback can be used to
   * define the default JLIcon instance, returned whenever lookup fails
   *
   * @param props - passed directly to JLIcon.element
   *
   * @returns an SVGElement
   */
  static getElement({
    name,
    fallback,
    ...props
  }: { name: string; fallback?: JLIcon } & JLIcon.IProps) {
    let icon = JLIcon._get(name, fallback);
    if (!icon) {
      icon = blankIcon;
      props.className = classesDedupe(name, props.className);
    }

    return icon.element(props);
  }

  /**
   * Get any existing JLIcon instance by name, construct a React element
   * from it, then return said element.
   *
   * @param name - name of the JLIcon instance to fetch
   *
   * @param fallback - if left undefined, use automatic fallback to
   * icons-as-css-background behavior: elem will be constructed using
   * a blank icon with `elem.className = classes(name, props.className)`,
   * where elem is the return value. Otherwise, fallback can be used to
   * define the default JLIcon instance, used to construct the return
   * elem whenever lookup fails
   *
   * @param props - passed directly to JLIcon.react
   *
   * @returns a React element
   */
  static getReact({
    name,
    fallback,
    ...props
  }: { name: string; fallback?: JLIcon } & JLIcon.IReactProps) {
    let icon = JLIcon._get(name, fallback);
    if (!icon) {
      icon = blankIcon;
      props.className = classesDedupe(name, props.className);
    }

    return <icon.react {...props} />;
  }

  /**
   * Remove the svg element from a container element
   */
  static remove(container: HTMLElement) {
    // clean up all children
    while (container.firstChild) {
      container.firstChild.remove();
    }

    // remove the icon class recorded in the dataset
    if (container.dataset?.iconClass) {
      container.classList.remove(container.dataset.iconClass);
    }
    // remove icon class from the dataset (even if empty)
    delete container.dataset?.iconClass;

    return container;
  }

  /**
   * Toggle icon debug from off-to-on, or vice-versa.
   *
   * @param debug - optional boolean to force debug on or off
   */
  static toggleDebug(debug?: boolean) {
    JLIcon._debug = debug ?? !JLIcon._debug;
  }

  constructor({ name, svgstr }: JLIcon.IJLIcon) {
    this.name = name;
    this._className = Private.nameToClassName(name);
    this.svgstr = svgstr;

    this.react = this._initReact();

    JLIcon._instances.set(this.name, this);
    JLIcon._instances.set(this._className, this);
  }

  /**
   * Create an icon as a DOM element
   *
   * @param className - a string that will be used as the class
   * of the container element. Overrides any existing class
   *
   * @param container - a preexisting DOM element that
   * will be used as the container for the svg element
   *
   * @param label - text that will be displayed adjacent
   * to the icon
   *
   * @param title - a tooltip for the icon
   *
   * @param tag - if container is not explicitly
   * provided, this tag will be used when creating the container
   *
   * @propsStyle - style parameters that get passed to TypeStyle in
   * order to generate a style class. The style class will be added
   * to the icon container's classes, while the style itself will be
   * applied to any svg elements within the container.
   *
   * @returns A DOM element that contains an (inline) svg element
   * that displays an icon
   */
  element({
    className,
    container,
    label,
    title,
    tag = 'div',
    ...propsStyle
  }: JLIcon.IProps = {}): HTMLElement {
    // check if icon element is already set
    const maybeSvgElement = container?.firstChild as HTMLElement;
    if (maybeSvgElement?.dataset?.iconId === this._uuid) {
      // return the existing icon element
      return maybeSvgElement;
    }

    // ensure that svg html is valid
    const svgElement = this.resolveSvg();
    if (!svgElement) {
      // bail if failing silently, return blank element
      return document.createElement('div');
    }

    let ret: HTMLElement;
    if (container) {
      // take ownership by removing any existing children
      while (container.firstChild) {
        container.firstChild.remove();
      }

      ret = svgElement;
    } else {
      // create a container if needed
      container = document.createElement(tag);

      ret = container;
    }
    if (label != null) {
      container.textContent = label;
    }
    this._initContainer({ container, className, propsStyle, title });

    // add the svg node to the container
    container.appendChild(svgElement);

    return ret;
  }

  render(container: HTMLElement, props: JLIcon.IProps = {}): void {
    // TODO: move this title fix to the Lumino side
    container.removeAttribute('title');

    this.element({ container, ...props });
  }

  resolveSvg(title?: string): HTMLElement | null {
    const svgDoc = new DOMParser().parseFromString(
      this._svgstr,
      'image/svg+xml'
    );
    const svgElement = svgDoc.documentElement;

    // structure of error element varies by browser, search at top level
    if (svgDoc.getElementsByTagName('parsererror').length > 0) {
      const errmsg = `SVG HTML was malformed for JLIcon instance.\nname: ${name}, svgstr: ${this._svgstr}`;
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
      svgElement.dataset.icon = this.name;
      svgElement.dataset.iconId = this._uuid;

      if (title) {
        Private.setTitleSvg(svgElement, title);
      }

      return svgElement;
    }
  }

  get svgstr() {
    return this._svgstr;
  }

  set svgstr(svgstr: string) {
    this._svgstr = svgstr;

    // associate a unique id with this particular svgstr
    this._uuid = UUID.uuid4();
  }

  unrender(container: HTMLElement): void {
    return;
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
  }): string {
    if (title != null) {
      container.title = title;
    }

    const classStyle = iconStyle(propsStyle);
    if (className != null) {
      // override the container class with explicitly passed-in class + style class
      const classResolved = classes(className, classStyle);
      container.className = classResolved;
      container.dataset.iconClass = classResolved;
    } else if (classStyle) {
      // add the style class to the container class
      container.classList.add(classStyle);
      container.dataset.iconClass = classStyle;
    } else {
      container.dataset.iconClass = '';
    }

    return container.dataset.iconClass;
  }

  protected _initReact() {
    const component = React.forwardRef(
      (
        {
          className,
          container,
          label,
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

          return (
            <React.Fragment>
              {svgComponent}
              {label}
            </React.Fragment>
          );
        } else {
          const classResolved = classes(className, iconStyle(propsStyle));
          return (
            <Tag className={classResolved} data-icon-class={classResolved}>
              {svgComponent}
              {label}
            </Tag>
          );
        }
      }
    );

    component.displayName = `JLIcon_${this.name}`;
    return component;
  }

  readonly name: string;
  readonly react: JLIcon.IReact;

  protected _className: string;
  protected _svgstr: string;
  protected _uuid: string;
}

/**
 * A namespace for JLIcon statics.
 */
export namespace JLIcon {
  /**
   * The IJLIcon interface. Outside of this interface the actual
   * implementation of JLIcon may vary
   */
  export interface IJLIcon {
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
     * Optional text label that will be added as a sibling to the icon's
     * svg node
     */
    label?: string;

    /**
     * HTML element tag used to create the icon's outermost container node,
     * if no container is passed in
     */
    tag?: 'div' | 'span';

    /**
     * Optional title that will be set on the icon's outermost container node
     */
    title?: string;
  }

  export type IReactProps = IProps & React.RefAttributes<SVGElement>;

  export type IReact = React.ForwardRefExoticComponent<IReactProps>;
}

namespace Private {
  export function nameToClassName(name: string): string {
    return 'jp-' + Text.camelCase(name, true) + 'Icon';
  }

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

// need to be at the bottom since constructor depends on Private
export const badIcon = new JLIcon({ name: 'bad', svgstr: badSvg });
export const blankIcon = new JLIcon({ name: 'blank', svgstr: blankSvg });
