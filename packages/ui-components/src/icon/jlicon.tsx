// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { UUID } from '@lumino/coreutils';
import { Signal } from '@lumino/signaling';
import React from 'react';

import { Text } from '@jupyterlab/coreutils';

import { iconStyle, IIconStyle } from '../style/icon';
import { getReactAttrs, classes, classesDedupe } from '../utils';

import badSvg from '../../style/debug/bad.svg';
import blankSvg from '../../style/debug/blank.svg';

export class JLIcon implements JLIcon.IJLIcon {
  /***********
   * statics *
   ***********/

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

    // remove all classes
    container.className = '';

    return container;
  }

  /**
   * Resolve an icon name or a {name, svgstr} pair into an
   * actual JLIcon.
   *
   * @param icon - either a string with the name of an existing icon
   * or an object with {name: string, svgstr: string} fields.
   *
   * @returns a JLIcon instance, or null if an icon name was passed in
   * and lookup fails.
   */
  static resolve(icon: JLIcon.IJLIconSpec): JLIcon | null {
    if (icon instanceof JLIcon) {
      // icon already is a JLIcon
      return icon;
    }

    if (typeof icon === 'string') {
      // do a dynamic lookup of existing icon by name
      return JLIcon._get(icon) ?? null;
    }

    // icon is a non-JLIcon {name, svgstr} pair
    return JLIcon._get(icon.name) ?? new JLIcon(icon) ?? null;
  }

  /**
   * Resolve a {name, svgstr} pair into an actual svg node.
   */
  static resolveSvg({ name, svgstr }: JLIcon.IJLIcon): HTMLElement | null {
    const svgDoc = new DOMParser().parseFromString(svgstr, 'image/svg+xml');

    const svgError = svgDoc.querySelector('parsererror');

    // structure of error element varies by browser, search at top level
    if (svgError) {
      // parse failed, svgElement will be an error box
      const errmsg = `SVG HTML was malformed for JLIcon instance.\nname: ${name}, svgstr: ${svgstr}`;
      if (JLIcon._debug) {
        // fail noisily, render the error box
        console.error(errmsg);
        return svgError as HTMLElement;
      } else {
        // bad svg is always a real error, fail silently but warn
        console.warn(errmsg);
        return null;
      }
    } else {
      // parse succeeded
      return svgDoc.documentElement;
    }
  }

  /**
   * Toggle icon debug from off-to-on, or vice-versa.
   *
   * @param debug - optional boolean to force debug on or off
   */
  static toggleDebug(debug?: boolean) {
    JLIcon._debug = debug ?? !JLIcon._debug;
  }

  private static _debug: boolean = false;
  private static _instances = new Map<string, JLIcon>();

  /***********
   * members *
   ***********/

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
    const svgElement = this._initSvg({ uuid: this._uuid });
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

  get svgstr() {
    return this._svgstr;
  }

  set svgstr(svgstr: string) {
    this._svgstr = svgstr;

    // associate a new unique id with this particular svgstr
    const uuid = UUID.uuid4();
    const uuidOld = this._uuid;
    this._uuid = uuid;

    // update icon elements created using .element method
    document
      .querySelectorAll(`[data-icon-id=${uuidOld}]`)
      .forEach(oldSvgElement => {
        const svgElement = this._initSvg({ uuid });
        if (svgElement) {
          oldSvgElement.replaceWith(svgElement);
        }
      });

    // trigger update of icon elements created using other methods
    this._svgReplaced.emit();
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
      return classResolved;
    } else if (classStyle) {
      // add the style class to the container class
      container.classList.add(classStyle);
      return classStyle;
    } else {
      return '';
    }
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
        // set up component state via useState hook
        const [, setId] = React.useState(this._uuid);

        // subscribe to svg replacement via useEffect hook
        React.useEffect(() => {
          const onSvgReplaced = () => {
            setId(this._uuid);
          };

          this._svgReplaced.connect(onSvgReplaced);

          // specify cleanup callback as hook return
          return () => {
            this._svgReplaced.disconnect(onSvgReplaced);
          };
        });

        // make it so that tag can be used as a jsx component
        const Tag = tag;

        // ensure that svg html is valid
        const svgElement = this._initSvg();
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
          return (
            <Tag className={classes(className, iconStyle(propsStyle))}>
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

  protected _initSvg({
    title,
    uuid
  }: { title?: string; uuid?: string } = {}): HTMLElement | null {
    const svgElement = JLIcon.resolveSvg(this);

    if (!svgElement) {
      // bail on null svg element
      return svgElement;
    }

    if (svgElement.tagName !== 'parsererror') {
      // svgElement is an actual svg node, augment it
      svgElement.dataset.icon = this.name;

      if (uuid) {
        svgElement.dataset.iconId = uuid;
      }

      if (title) {
        Private.setTitleSvg(svgElement, title);
      }
    }

    return svgElement;
  }

  readonly name: string;

  /**
   * A React component that will create the icon.
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
   */
  readonly react: JLIcon.IReact;

  protected _className: string;
  protected _svgReplaced = new Signal<this, void>(this);
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
    /**
     * The name of the icon. By convention, the icon name will be namespaced
     * as so:
     *
     *     "pkg-name:icon-name"
     */
    readonly name: string;

    /**
     * A string containing the raw contents of an svg file.
     */
    svgstr: string;
  }

  /**
   * A type that can be resolved to a JLIcon instance.
   */
  export type IJLIconSpec = string | IJLIcon;

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
  /**
   * @param name - icon name. May be namespaced as per `some-pkg:foo-bar`
   *
   * @returns given a name of `some-pkg:foo-bar`, returns `jp-FooBarIcon`
   */
  export function nameToClassName(name: string): string {
    return 'jp-' + Text.camelCase(name.split(':').pop()!, true) + 'Icon';
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
