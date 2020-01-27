// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { UUID } from '@lumino/coreutils';
import { Signal } from '@lumino/signaling';
import { ElementAttrs, VirtualNode } from '@lumino/virtualdom';
import React from 'react';
import ReactDOM from 'react-dom';

import { Text } from '@jupyterlab/coreutils';

import { iconStyle, IIconStyle } from '../style';
import { getReactAttrs, classes } from '../utils';

import badSvgstr from '../../style/debug/bad.svg';
import blankSvgstr from '../../style/debug/blank.svg';
import refreshSvgstr from '../../style/icons/toolbar/refresh.svg';

export class LabIcon implements LabIcon.ILabIcon, LabIcon.IRenderer {
  /***********
   * statics *
   ***********/

  /**
   * Get any existing LabIcon instance by name.
   *
   * @param name - name of the LabIcon instance to fetch
   *
   * @param fallback - optional default LabIcon instance to use if
   * name is not found
   *
   * @returns A LabIcon instance
   */
  private static _get(name: string, fallback?: LabIcon): LabIcon | undefined {
    // TODO: remove name-might-actually-be-className shim here
    for (let className of name.split(/\s+/)) {
      if (LabIcon._instances.has(className)) {
        return LabIcon._instances.get(className);
      }
    }

    // lookup failed
    if (LabIcon._debug) {
      // fail noisily
      console.error(`Invalid icon name: ${name}`);
      return badIcon;
    }

    // fail silently
    return fallback;
  }

  /**
   * UNSTABLE - only exists for backwards compatibility in two special cases
   *
   * TODO: Fix the remaining cases that rely on this and then remove this method:
   *     - index.tsx in launcher
   *     - pluginlist.tsx in settingseditor
   */
  static UNSTABLE_getReact({
    name,
    fallback,
    ...props
  }: { name: string; fallback?: LabIcon } & LabIcon.IReactProps) {
    const icon = LabIcon._get(name, fallback);
    if (!icon) {
      props.className = classes(name, props.className);
      // try to render the icon as a css background image via iconClass
      return <Private.iconAsCssBackgroundReact {...props} />;
    }

    return <icon.react {...props} />;
  }

  /**
   * Remove any rendered icon from the element that contains it
   *
   * @param container - a DOM node into which an icon was
   * previously rendered
   *
   * @returns the cleaned container
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
   * actual LabIcon.
   *
   * @param icon - either a string with the name of an existing icon
   * or an object with {name: string, svgstr: string} fields.
   *
   * @returns a LabIcon instance
   */
  static resolve({ icon }: { icon: LabIcon.IResolvable }): LabIcon {
    if (icon instanceof LabIcon) {
      // icon already is a LabIcon; nothing to do here
      return icon;
    }

    if (typeof icon === 'string') {
      // do a dynamic lookup of existing icon by name
      const resolved = LabIcon._get(icon);
      if (resolved) {
        return resolved;
      }

      // no matching icon currently registered, create a new loading icon
      // TODO: find better icon (maybe animate?) for loading icon
      return new LabIcon({ name: icon, svgstr: refreshSvgstr, _loading: true });
    }

    // icon was provided as a non-LabIcon {name, svgstr} pair, communicating
    // an intention to create a new icon
    return new LabIcon(icon);
  }

  /**
   * Resolve an icon name or a {name, svgstr} pair into a DOM element.
   * If icon arg is undefined, the function will fall back to trying to render
   * the icon as a CSS background image, via the iconClass arg.
   * If both icon and iconClass are undefined, this function will return
   * an empty div.
   *
   * @param icon - optional, either a string with the name of an existing icon
   * or an object with {name: string, svgstr: string} fields.
   *
   * @param iconClass - optional, if the icon arg is not set, the iconClass arg
   * should be a CSS class associated with an existing CSS background-image.
   *
   * @param props - any additional args are passed though to the element method
   * of the resolved icon on render
   *
   * @returns a DOM node with the resolved icon rendered into it
   */
  static resolveElement({
    icon,
    iconClass,
    ...props
  }: { icon?: LabIcon.IResolvable; iconClass?: string } & LabIcon.IProps) {
    // combine iconClass with any class from the props
    props.className = classes(iconClass, props.className);

    if (!icon) {
      // try to render the icon as a css background image via iconClass
      return Private.iconAsCssBackgroundElement(props);
    }

    return LabIcon.resolve({ icon }).element(props);
  }

  /**
   * Resolve an icon name or a {name, svgstr} pair into a React component.
   * If icon arg is undefined, the function will fall back to trying to render
   * the icon as a CSS background image, via the iconClass arg.
   * If both icon and iconClass are undefined, the returned component
   * will simply render an empty div.
   *
   * @param icon - optional, either a string with the name of an existing icon
   * or an object with {name: string, svgstr: string} fields.
   *
   * @param iconClass - optional, if the icon arg is not set, the iconClass arg
   * should be a CSS class associated with an existing CSS background-image.
   *
   * @param props - any additional args are passed though to the React component
   * of the resolved icon on render
   *
   * @returns a React component that will render the resolved icon
   */
  static resolveReact({
    icon,
    iconClass,
    ...props
  }: { icon?: LabIcon.IResolvable; iconClass?: string } & LabIcon.IReactProps) {
    // combine iconClass with any class from the props
    props.className = classes(iconClass, props.className);

    if (!icon) {
      // try to render the icon as a css background image via iconClass
      return <Private.iconAsCssBackgroundReact {...props} />;
    }

    const resolved = LabIcon.resolve({ icon });
    return <resolved.react {...props} />;
  }

  /**
   * Resolve a {name, svgstr} pair into an actual svg node.
   */
  static resolveSvg({ name, svgstr }: LabIcon.ILabIcon): HTMLElement | null {
    const svgDoc = new DOMParser().parseFromString(svgstr, 'image/svg+xml');

    const svgError = svgDoc.querySelector('parsererror');

    // structure of error element varies by browser, search at top level
    if (svgError) {
      // parse failed, svgElement will be an error box
      const errmsg = `SVG HTML was malformed for LabIcon instance.\nname: ${name}, svgstr: ${svgstr}`;
      if (LabIcon._debug) {
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
    LabIcon._debug = debug ?? !LabIcon._debug;
  }

  private static _debug: boolean = false;
  private static _instances = new Map<string, LabIcon>();

  /***********
   * members *
   ***********/

  constructor({
    name,
    svgstr,
    render,
    unrender,
    rendererClass = LabIcon.ElementRenderer,
    _loading = false
  }: LabIcon.IOptions & { _loading?: boolean }) {
    if (!(name && svgstr)) {
      // sanity check failed
      console.error(
        `When defining a new LabIcon, name and svgstr must both be non-empty strings. name: ${name}, svgstr: ${svgstr}`
      );
      return badIcon;
    }

    // currently this needs to be set early, before checks for existing icons
    this._loading = _loading;

    // check to see if this is a redefinition of an existing icon
    if (LabIcon._instances.has(name)) {
      // fetch the existing icon, replace its svg, then return it
      const icon = LabIcon._instances.get(name)!;
      if (this._loading) {
        // replace the placeholder svg in icon
        icon.svgstr = svgstr;
        this._loading = false;
        return icon;
      } else {
        // already loaded icon svg exists; replace it and warn
        // TODO: need to see if this warning is useful or just noisy
        console.warn(
          `Redefining previously loaded icon svgstr. name: ${name}, svgstrOld: ${icon.svgstr}, svgstr: ${svgstr}`
        );
        icon.svgstr = svgstr;
        return icon;
      }
    }

    this.name = name;
    this._className = Private.nameToClassName(name);
    this.svgstr = svgstr;

    this.react = this._initReact();

    if (render && unrender) {
      this.render = render.bind(this);
      this.unrender = unrender.bind(this);
    } else {
      // set render and unrender methods based on the supplied rendererClass
      const renderer = new rendererClass(this);
      this.render = renderer.render.bind(this);
      this.unrender = renderer.unrender.bind(this);
    }
    LabIcon._instances.set(this.name, this);
    LabIcon._instances.set(this._className, this);
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
   * @param propsStyle - style parameters that get passed to TypeStyle in
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
  }: LabIcon.IProps = {}): HTMLElement {
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
    Private.initContainer({ container, className, propsStyle, title });

    // add the svg node to the container
    container.appendChild(svgElement);

    return ret;
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
        }: LabIcon.IProps = {},
        ref: LabIcon.IReactRef
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
          Private.initContainer({ container, className, propsStyle, title });

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

    component.displayName = `LabIcon_${this.name}`;
    return component;
  }

  protected _initSvg({
    title,
    uuid
  }: { title?: string; uuid?: string } = {}): HTMLElement | null {
    const svgElement = LabIcon.resolveSvg(this);

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
   * @param propsStyle - style parameters that get passed to TypeStyle in
   * order to generate a style class. The style class will be added
   * to the icon container's classes, while the style itself will be
   * applied to any svg elements within the container.
   */
  readonly react: LabIcon.IReact;

  readonly render: (container: HTMLElement, props?: LabIcon.IProps) => void;
  readonly unrender: (container: HTMLElement) => void;

  protected _className: string;
  protected _loading: boolean;
  protected _svgReplaced = new Signal<this, void>(this);
  protected _svgstr: string;
  protected _uuid: string;

  // needed due to the quirks of the current implementation of IRenderer
  protected _icon = this;
  protected _rendererOptions = {};
}

/**
 * A namespace for LabIcon statics.
 */
export namespace LabIcon {
  /**************
   * interfaces *
   **************/

  /**
   * The simplest possible interface for defining a generic icon.
   */
  export interface IIcon {
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
   * Interface for generic renderer. Compatible with interface of
   * Title.iconRenderer from @lumino/widgets
   */
  export interface IRenderer {
    readonly render: (container: HTMLElement, options: any) => void;
    readonly unrender: (container: HTMLElement) => void;
  }

  export interface IRendererOptions {
    attrs?: ElementAttrs;
    children?: ReadonlyArray<VirtualNode>;
    props?: IProps;
  }

  /**
   * The ILabIcon interface. Outside of this interface the actual
   * implementation of LabIcon may vary
   */
  export interface ILabIcon extends IIcon, IRenderer {}

  /**
   * Interface defining the parameters to be passed to the LabIcon
   * constructor
   */
  export interface IOptions extends IIcon, Partial<IRenderer> {
    rendererClass?: typeof Renderer;
  }

  /**
   * The input props for creating a new LabIcon
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

  /*********
   * types *
   *********/

  /**
   * A type that can be resolved to a LabIcon instance.
   */
  export type IResolvable = string | (IIcon & Partial<IRenderer>);

  /**
   * The type of the svg node ref that can be passed into icon React components
   */
  export type IReactRef = React.RefObject<SVGElement>;

  /**
   * The properties that can be passed into the React component stored in
   * the .react field of a LabIcon.
   */
  export type IReactProps = IProps & React.RefAttributes<SVGElement>;

  /**
   * The complete type of the React component stored in the .react
   * field of a LabIcon.
   */
  export type IReact = React.ForwardRefExoticComponent<IReactProps>;

  /***********
   * classes *
   ***********/

  /**
   * Base implementation of IRenderer.
   */
  export class Renderer implements IRenderer {
    constructor(
      protected _icon: LabIcon,
      protected _rendererOptions: IRendererOptions = {}
    ) {}

    // tslint:disable-next-line:no-empty
    render(container: HTMLElement, _options: IRendererOptions = {}): void {}
    // TODO: make unrenderer optional once @lumino/virtualdom > 1.4.1 is used
    // tslint:disable-next-line:no-empty
    unrender(container: HTMLElement): void {}
  }

  /**
   * Implementation of IRenderer that creates the icon svg node
   * as a DOM element.
   */
  export class ElementRenderer extends Renderer {
    render(container: HTMLElement, _options: IRendererOptions = {}): void {
      // TODO: move this title fix to the Lumino side
      container.removeAttribute('title');

      // TODO: decide how to implement rendering of passed in child virtual nodes
      this._icon.element({
        container,
        ...this._rendererOptions.props,
        ..._options.props
      });
    }

    // tslint:disable-next-line:no-empty
    unrender(container: HTMLElement): void {}
  }

  /**
   * Implementation of IRenderer that creates the icon svg node
   * as a React component.
   */
  export class ReactRenderer extends Renderer {
    render(container: HTMLElement, _options: IRendererOptions = {}): void {
      // TODO: move this title fix to the Lumino side
      container.removeAttribute('title');

      // TODO: decide how to implement rendering of passed in child virtual nodes
      return ReactDOM.render(
        <this._icon.react
          container={container}
          {...{ ...this._rendererOptions.props, ..._options.props }}
        />,
        container
      );
    }

    unrender(container: HTMLElement): void {
      ReactDOM.unmountComponentAtNode(container);
    }
  }
}

namespace Private {
  export function iconAsCssBackgroundElement({
    className = '',
    container,
    label,
    title,
    tag = 'div',
    ...propsStyle
  }: LabIcon.IProps): HTMLElement {
    if (container?.className === className) {
      // nothing needs doing, return the icon node
      return container;
    }

    if (container) {
      // take ownership by removing any existing children
      while (container.firstChild) {
        container.firstChild.remove();
      }
    } else {
      // create a container if needed
      container = document.createElement(tag);
    }
    if (label != null) {
      container.textContent = label;
    }
    Private.initContainer({ container, className, propsStyle, title });

    return container;
  }

  export const iconAsCssBackgroundReact = React.forwardRef(
    (
      {
        className = '',
        container,
        label,
        title,
        tag = 'div',
        ...propsStyle
      }: LabIcon.IProps,
      ref: LabIcon.IReactRef
    ) => {
      // make it so that tag can be used as a jsx component
      const Tag = tag;

      if (container) {
        initContainer({ container, className, propsStyle, title });

        return <></>;
      } else {
        // if ref is defined, we create a blank svg node and point ref to it
        return (
          <Tag className={classes(className, iconStyle(propsStyle))}>
            {ref && blankIcon.react({ ref })}
            {label}
          </Tag>
        );
      }
    }
  );

  export function initContainer({
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
export const badIcon = new LabIcon({
  name: 'ui-components:bad',
  svgstr: badSvgstr
});
export const blankIcon = new LabIcon({
  name: 'ui-components:blank',
  svgstr: blankSvgstr
});
