// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { UUID } from '@lumino/coreutils';
import { Signal } from '@lumino/signaling';
import type {
  ElementAttrs,
  VirtualElement,
  VirtualNode
} from '@lumino/virtualdom';
import React from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import badSvgstr from '../../style/debug/bad.svg';
import blankSvgstr from '../../style/debug/blank.svg';
import refreshSvgstr from '../../style/icons/toolbar/refresh.svg';
import { LabIconStyle } from '../style';
import { classes, getReactAttrs } from '../utils';
import type { ISelectorContext } from './svgstyle';
import {
  addInitialValues,
  edit,
  parseStyleSheet,
  renameAnimations,
  renameDefinitions,
  rewriteDeclarations,
  rewriteSelectors,
  serializeStyleSheet,
  setStyleText,
  styleText,
  urlReferences,
  XLINK_NAMESPACE
} from './svgstyle';

export class LabIcon implements LabIcon.ILabIcon, VirtualElement.IRenderer {
  /** *********
   * statics *
   ***********/

  /**
   * Remove any rendered icon from the element that contains it
   *
   * @param container - a DOM node into which an icon was
   * previously rendered
   *
   * @returns the cleaned container
   */
  static remove(container: HTMLElement): HTMLElement {
    // clean up all children
    while (container.firstChild) {
      container.firstChild.remove();
    }

    // remove all classes
    container.className = '';

    return container;
  }

  /**
   * Resolve an icon name or a \{name, svgstr\} pair into an
   * actual LabIcon.
   *
   * @param options - icon: either a string with the name of an existing icon
   * or an object with \{name: string, svgstr: string\} fields.
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
      const resolved = LabIcon._instances.get(icon);
      if (resolved) {
        return resolved;
      }

      // lookup failed
      if (LabIcon._debug) {
        // fail noisily
        console.warn(
          `Lookup failed for icon, creating loading icon. icon: ${icon}`
        );
      }

      // no matching icon currently registered, create a new loading icon
      // TODO: find better icon (maybe animate?) for loading icon
      return new LabIcon({ name: icon, svgstr: refreshSvgstr, _loading: true });
    }

    // icon was provided as a non-LabIcon \{name, svgstr\} pair, communicating
    // an intention to create a new icon
    return new LabIcon(icon);
  }

  /**
   * Resolve an icon name or a \{name, svgstr\} pair into a DOM element.
   * If icon arg is undefined, the function will fall back to trying to render
   * the icon as a CSS background image, via the iconClass arg.
   * If both icon and iconClass are undefined, this function will return
   * an empty div.
   *
   * @param icon - optional, either a string with the name of an existing icon
   * or an object with \{name: string, svgstr: string\} fields
   *
   * @param iconClass - optional, if the icon arg is not set, the iconClass arg
   * should be a CSS class associated with an existing CSS background-image
   *
   * @param fallback - DEPRECATED, optional, a LabIcon instance that will
   * be used if neither icon nor iconClass are defined
   *
   * @param props - any additional args are passed though to the element method
   * of the resolved icon on render
   *
   * @returns a DOM node with the resolved icon rendered into it
   */
  static resolveElement({
    icon,
    iconClass,
    fallback,
    ...props
  }: Partial<LabIcon.IResolverProps> & LabIcon.IProps): HTMLElement {
    if (!Private.isResolvable(icon)) {
      if (!iconClass && fallback) {
        // if neither icon nor iconClass are defined/resolvable, use fallback
        return fallback.element(props);
      }

      // set the icon's class to iconClass plus props.className
      props.className = classes(iconClass, props.className);
      // render icon as css background image, assuming one is set on iconClass
      return Private.blankElement(props);
    }

    return LabIcon.resolve({ icon }).element(props);
  }

  /**
   * Resolve an icon name or a \{name, svgstr\} pair into a React component.
   * If icon arg is undefined, the function will fall back to trying to render
   * the icon as a CSS background image, via the iconClass arg.
   * If both icon and iconClass are undefined, the returned component
   * will simply render an empty div.
   *
   * @param icon - optional, either a string with the name of an existing icon
   * or an object with \{name: string, svgstr: string\} fields
   *
   * @param iconClass - optional, if the icon arg is not set, the iconClass arg
   * should be a CSS class associated with an existing CSS background-image
   *
   * @param fallback - DEPRECATED, optional, a LabIcon instance that will
   * be used if neither icon nor iconClass are defined
   *
   * @param props - any additional args are passed though to the React component
   * of the resolved icon on render
   *
   * @returns a React component that will render the resolved icon
   */
  static resolveReact({
    icon,
    iconClass,
    fallback,
    ...props
  }: Partial<LabIcon.IResolverProps> & LabIcon.IReactProps): JSX.Element {
    if (!Private.isResolvable(icon)) {
      if (!iconClass && fallback) {
        // if neither icon nor iconClass are defined/resolvable, use fallback
        return <fallback.react {...props} />;
      }

      // set the icon's class to iconClass plus props.className
      props.className = classes(iconClass, props.className);
      // render icon as css background image, assuming one is set on iconClass
      return <Private.blankReact {...props} />;
    }

    const resolved = LabIcon.resolve({ icon });
    return <resolved.react {...props} />;
  }

  /**
   * Resolve a \{name, svgstr\} pair into an actual svg node.
   */
  static resolveSvg({ name, svgstr }: LabIcon.IIcon): HTMLElement | null {
    const svgDoc = new DOMParser().parseFromString(
      Private.svgstrShim(svgstr),
      'image/svg+xml'
    );

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
  static toggleDebug(debug?: boolean): void {
    LabIcon._debug = debug ?? !LabIcon._debug;
  }

  private static _debug: boolean = false;
  private static _instances = new Map<string, LabIcon>();

  /** *********
   * members *
   ***********/

  constructor({
    name,
    svgstr,
    render,
    unrender,
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
        if (LabIcon._debug) {
          console.warn(
            `Redefining previously loaded icon svgstr. name: ${name}, svgstrOld: ${icon.svgstr}, svgstr: ${svgstr}`
          );
        }
        icon.svgstr = svgstr;
        return icon;
      }
    }

    this.name = name;
    this.react = this._initReact(name);
    this.svgstr = svgstr;

    // setup custom render/unrender methods, if passed in
    this._initRender({ render, unrender });

    LabIcon._instances.set(this.name, this);
  }

  /**
   * Get a view of this icon that is bound to the specified icon/style props
   *
   * @param optional icon/style props (same as args for .element
   * and .react methods). These will be bound to the resulting view
   *
   * @returns a view of this LabIcon instance
   */
  bindprops(props?: LabIcon.IProps): LabIcon {
    const view = Object.create(this);
    view._props = props;
    view.react = view._initReact(view.name + '_bind');
    return view;
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
   * @param stylesheet - optional string naming a builtin icon
   * stylesheet, for example 'menuItem' or `statusBar`. Can also be an
   * object defining a custom icon stylesheet, or a list of builtin
   * stylesheet names and/or custom stylesheet objects. If array,
   * the given stylesheets will be merged.
   *
   *   See @jupyterlab/ui-components/src/style/icon.ts for details
   *
   * @param elementPosition - optional position for the inner svg element
   *
   * @param elementSize - optional size for the inner svg element.
   * Set to 'normal' to get a standard 16px x 16px icon
   *
   * @param ...elementCSS - all additional args are treated as
   * overrides for the CSS props applied to the inner svg element
   *
   * @returns A DOM element that contains an (inline) svg element
   * that displays an icon
   */
  element(props: LabIcon.IProps = {}): HTMLElement {
    let {
      className,
      container,
      label,
      title,
      tag = 'div',
      ...styleProps
    }: LabIcon.IProps = { ...this._props, ...props };

    // check if icon element is already set
    const maybeSvgElement = container?.firstChild as HTMLElement;
    if (maybeSvgElement?.dataset?.iconId === this._uuid) {
      // return the existing icon element
      return maybeSvgElement;
    }

    // ensure that svg html is valid
    if (!this.svgElement) {
      // bail if failing silently, return blank element
      return document.createElement('div');
    }

    if (container) {
      // take ownership by removing any existing children
      while (container.firstChild) {
        container.firstChild.remove();
      }
    } else if (tag) {
      // create a container if needed
      container = document.createElement(tag);
    }

    const svgElement = Private.cloneSvgElement(this.svgElement);
    if (!container) {
      if (label) {
        console.warn();
      }
      return svgElement;
    }

    if (label != null) {
      container.textContent = label;
    }

    Private.initContainer({
      container: container!,
      className,
      styleProps,
      title
    });

    // add the svg node to the container
    container.appendChild(svgElement);

    return container;
  }

  render(container: HTMLElement, options?: LabIcon.IRendererOptions): void {
    let label = options?.children?.[0];
    // narrow type of label
    if (typeof label !== 'string') {
      label = undefined;
    }

    this.element({
      container,
      label,
      ...options?.props
    });
  }

  protected get svgElement(): HTMLElement | null {
    if (this._svgElement === undefined) {
      this._svgElement = this._initSvg({ uuid: this._uuid });
    }

    return this._svgElement;
  }

  protected get svgInnerHTML(): string | null {
    if (this._svgInnerHTML === undefined) {
      if (this.svgElement === null) {
        // the svg element resolved to null, mark this null too
        this._svgInnerHTML = null;
      } else {
        this._svgInnerHTML = this.svgElement.innerHTML;
      }
    }

    return this._svgInnerHTML;
  }

  protected get svgReactAttrs(): { [key: string]: string | null } | null {
    if (this._svgReactAttrs === undefined) {
      if (this.svgElement === null) {
        // the svg element resolved to null, mark this null too
        this._svgReactAttrs = null;
      } else {
        this._svgReactAttrs = getReactAttrs(this.svgElement, {
          ignore: ['data-icon-id']
        });
      }
    }

    return this._svgReactAttrs;
  }

  get svgstr(): string {
    return this._svgstr;
  }

  set svgstr(svgstr: string) {
    this._svgstr = svgstr;

    // associate a new unique id with this particular svgstr
    const uuid = UUID.uuid4();
    const uuidOld = this._uuid;
    this._uuid = uuid;

    // empty the svg parsing intermediates cache
    this._svgElement = undefined;
    this._svgInnerHTML = undefined;
    this._svgReactAttrs = undefined;

    // update icon elements created using .element method
    document
      .querySelectorAll(`[data-icon-id="${uuidOld}"]`)
      .forEach(oldSvgElement => {
        if (this.svgElement) {
          oldSvgElement.replaceWith(Private.cloneSvgElement(this.svgElement));
        }
      });

    // trigger update of icon elements created using other methods
    this._svgReplaced.emit();
  }

  unrender?(container: HTMLElement, options?: LabIcon.IRendererOptions): void;

  protected _initReact(displayName: string) {
    const component = React.forwardRef(
      (props: LabIcon.IProps = {}, ref: LabIcon.IReactRef) => {
        const {
          className,
          container,
          label,
          title,
          slot,
          tag = 'div',
          ...styleProps
        }: LabIcon.IProps = { ...this._props, ...props };

        // set up component state via useState hook
        const [id, setId] = React.useState(this._uuid);

        // subscribe to svg replacement via useEffect hook
        React.useEffect(() => {
          const onSvgReplaced = () => {
            setId(this._uuid);
          };

          this._svgReplaced.connect(onSvgReplaced);
          // the svg may have been replaced after the render and before this effect
          onSvgReplaced();

          // specify cleanup callback as hook return
          return () => {
            this._svgReplaced.disconnect(onSvgReplaced);
          };
        }, []);

        // make it so that tag can be used as a jsx component
        const Tag = tag ?? React.Fragment;

        const svgData = React.useMemo(() => {
          const svgElement = this.svgElement;
          // ensure that svg html is valid
          if (!(svgElement && this.svgInnerHTML && this.svgReactAttrs)) {
            // bail if failing silently
            return null;
          }

          if (!Private.hasIdReferences(svgElement)) {
            // all copies can share the same markup
            return {
              svgReactAttrs: this.svgReactAttrs,
              svgInnerHTML: this.svgInnerHTML,
              ...Private.rootStyle(svgElement)
            };
          }

          const clone = Private.cloneSvgElement(svgElement);
          return {
            svgReactAttrs: getReactAttrs(clone, { ignore: ['data-icon-id'] }),
            svgInnerHTML: clone.innerHTML,
            ...Private.rootStyle(clone)
          };
        }, [id]);
        if (!svgData) {
          return <></>;
        }
        const { svgReactAttrs, svgInnerHTML, svgStyle, svgProperties } =
          svgData;

        const svgProps = { ...svgReactAttrs };
        if (!tag) {
          Object.assign(svgProps, {
            className:
              className || styleProps
                ? classes(className, LabIconStyle.styleClass(styleProps))
                : undefined,
            title: title,
            slot: slot
          });
        }

        // getReactAttrs skips the style attribute, so an svg that has one
        // renders through StyledSvg
        const svgComponent =
          svgStyle === null ? (
            <svg
              {...svgProps}
              dangerouslySetInnerHTML={{ __html: svgInnerHTML }}
              ref={ref as React.Ref<SVGSVGElement>}
            />
          ) : (
            <Private.StyledSvg
              {...svgProps}
              svgStyle={svgStyle}
              svgProperties={svgProperties}
              dangerouslySetInnerHTML={{ __html: svgInnerHTML }}
              ref={ref as React.Ref<SVGSVGElement>}
            />
          );

        if (container) {
          Private.initContainer({ container, className, styleProps, title });

          return (
            <React.Fragment>
              {svgComponent}
              {label}
            </React.Fragment>
          );
        } else {
          let attributes = {};
          if (Tag !== React.Fragment) {
            attributes = {
              className:
                className || styleProps
                  ? classes(className, LabIconStyle.styleClass(styleProps))
                  : undefined,
              title: title,
              slot: slot
            };
          }
          return (
            <Tag {...attributes}>
              {svgComponent}
              {label}
            </Tag>
          );
        }
      }
    );

    component.displayName = `LabIcon_${displayName}`;
    return component;
  }

  protected _initRender({
    render,
    unrender
  }: Partial<VirtualElement.IRenderer>): void {
    if (render) {
      this.render = render;
      if (unrender) {
        this.unrender = unrender;
      }
    } else if (unrender) {
      console.warn(
        'In _initRender, ignoring unrender arg since render is undefined'
      );
    }
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
      } else {
        // mark as a decorative
        svgElement.setAttribute('aria-hidden', 'true');
      }

      Private.prepareSvg(svgElement);
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
   * @param stylesheet - optional string naming a builtin icon
   * stylesheet, for example 'menuItem' or `statusBar`. Can also be an
   * object defining a custom icon stylesheet, or a list of builtin
   * stylesheet names and/or custom stylesheet objects. If array,
   * the given stylesheets will be merged.
   *
   *   See @jupyterlab/ui-components/src/style/icon.ts for details
   *
   * @param elementPosition - optional position for the inner svg element
   *
   * @param elementSize - optional size for the inner svg element.
   * Set to 'normal' to get a standard 16px x 16px icon
   *
   * @param ...elementCSS - all additional args are treated as
   * overrides for the CSS props applied to the inner svg element
   *
   * @param ref - forwarded to the ref prop of the icon's svg element
   */
  readonly react: LabIcon.IReact;

  protected _className: string;
  protected _loading: boolean;
  protected _props: LabIcon.IProps = {};
  protected _svgReplaced = new Signal<this, void>(this);
  protected _svgstr: string;
  protected _uuid: string;

  /**
   * Cache for svg parsing intermediates
   *   - undefined: the cache has not yet been populated
   *   - null: a valid, but empty, value
   */
  protected _svgElement: HTMLElement | null | undefined = undefined;
  protected _svgInnerHTML: string | null | undefined = undefined;
  protected _svgReactAttrs:
    | { [key: string]: string | null }
    | null
    | undefined = undefined;
}

/**
 * A namespace for LabIcon statics.
 */
export namespace LabIcon {
  /** ***********
   * interfaces *
   *************/

  /**
   * The simplest possible interface for defining a generic icon.
   */
  export interface IIcon extends IRenderMime.LabIcon.IIcon {}

  export interface IRendererOptions {
    attrs?: ElementAttrs;
    children?: ReadonlyArray<VirtualNode>;
    props?: IProps;
  }

  /**
   * The ILabIcon interface. Outside of this interface the actual
   * implementation of LabIcon may vary
   */
  export interface ILabIcon extends IIcon, VirtualElement.IRenderer {}

  /**
   * Interface defining the parameters to be passed to the LabIcon
   * constructor
   */
  export interface IOptions extends IIcon, Partial<VirtualElement.IRenderer> {}

  /**
   * The input props for creating a new LabIcon
   */
  export interface IProps extends LabIconStyle.IProps {
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
     *
     * #### Notes
     * If `null` is provided and no container is defined, the icon SVG will return directly
     * ignoring all other attributes (label, title,...)
     */
    tag?: 'div' | 'span' | null;

    /**
     * Optional title that will be set on the icon's outermost container node
     */
    title?: string;

    /**
     * Optional slot property to specify the position of the icon in the template
     */
    slot?: string | null;
  }

  export interface IResolverProps {
    icon?: IMaybeResolvable;
    iconClass?: string;
    fallback?: LabIcon;
  }

  /** ******
   * types *
   *********/

  /**
   * A type that can be resolved to a LabIcon instance.
   */
  export type IResolvable = IRenderMime.LabIcon.IResolvable;

  /**
   * A type that maybe can be resolved to a LabIcon instance.
   */
  export type IMaybeResolvable =
    | IResolvable
    | VirtualElement.IRenderer
    | undefined;

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
}

namespace Private {
  // XML cannot contain this character, so it cannot clash with svg content
  const SUFFIX_PLACEHOLDER = '\u0000';
  // the attributes whose value is an id or a list of ids
  const ID_LIST_ATTRIBUTES = new Set([
    'aria-activedescendant',
    'aria-controls',
    'aria-describedby',
    'aria-details',
    'aria-errormessage',
    'aria-flowto',
    'aria-labelledby',
    'aria-owns',
    'commandfor',
    'for',
    'form',
    'headers',
    'interestfor',
    'itemref',
    'list',
    'popovertarget'
  ]);
  const ANIMATION_VALUES = ['values', 'from', 'to', 'by'];
  // an extension that imports LabIcon through a deep path bundles its own
  // copy of this module, so all copies take suffixes from one counter on the
  // window; keep this key and its meaning the same in later versions
  const SUFFIX_COUNTER = Symbol.for(
    '@jupyterlab/ui-components:LabIcon.idSuffixCounter'
  );
  const plans = new WeakMap<Element, IPlan>();

  /**
   * The changes that each copy of an svg makes.
   */
  interface IPlan {
    /**
     * Index of each element to change (0 is the svg node, then document
     * order), the name of an attribute, and its value with the suffix
     * placeholder.
     */
    attributes: [number, string, string][];
    /** The ids of the svg and of its selectors, which no new id may repeat. */
    existing: Set<string>;
    /** The custom properties of a copy for its style elements. */
    properties: [string, string][];
  }

  /**
   * Make on the svg the changes that are the same in every copy, and keep
   * the changes that each copy makes.
   */
  export function prepareSvg(svgElement: Element): void {
    const plan = planCopies(svgElement);
    if (plan) {
      plans.set(svgElement, plan);
    }
  }

  /**
   * Clone the svg with ids and custom properties of its own.
   */
  export function cloneSvgElement(svgElement: HTMLElement): HTMLElement {
    const clone = svgElement.cloneNode(true) as HTMLElement;
    const plan = plans.get(svgElement);
    if (plan) {
      uniquifySvgIds(clone, plan);
    }
    return clone;
  }

  /**
   * Whether each copy of the svg needs its own ids.
   */
  export function hasIdReferences(svgElement: HTMLElement): boolean {
    return plans.has(svgElement);
  }

  /**
   * The text of the style attribute of the root of an svg, and its custom
   * properties as a React style, if it has any.
   */
  export function rootStyle(svg: HTMLElement): {
    svgStyle: string | null;
    svgProperties?: React.CSSProperties;
  } {
    const svgStyle = svg.getAttribute('style');
    if (svgStyle === null) {
      return { svgStyle };
    }
    let svgProperties: { [name: string]: string } | undefined;
    for (const name of Array.from(svg.style)) {
      if (name.startsWith('--')) {
        (svgProperties ??= {})[name] = svg.style.getPropertyValue(name);
      }
    }
    return { svgStyle, svgProperties };
  }

  const rootStyles = new WeakMap<Element, string>();

  /**
   * Give the root of a React copy the text of the style attribute of its svg.
   * A style that code set stays, unless the previous or the new text names
   * its property.
   */
  function setRootStyle(svg: SVGSVGElement | null, text: string): void {
    if (!svg || rootStyles.get(svg) === text) {
      return;
    }
    const previous = rootStyles.get(svg);
    rootStyles.set(svg, text);
    if (previous === undefined) {
      svg.setAttribute('style', text);
      return;
    }
    // remove the properties of the new text too: the style prop has set
    // its custom properties already
    const parsed = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    );
    for (const declarations of [previous, text]) {
      parsed.setAttribute('style', declarations);
      for (const name of Array.from(parsed.style)) {
        svg.style.removeProperty(name);
      }
    }
    const rest = svg.style.cssText;
    svg.setAttribute('style', rest ? `${rest} ${text}` : text);
  }

  /**
   * The properties of the svg of a React copy whose root has a style.
   */
  export interface IStyledSvgProps extends React.SVGAttributes<SVGSVGElement> {
    /** The text of the style attribute of the root. */
    svgStyle: string;
    /** Its custom properties, which markup rendered on the server keeps. */
    svgProperties?: React.CSSProperties;
  }

  /**
   * The svg of a React copy whose root has a style attribute. Its ref sets the
   * attribute text, with !important and the shorthands that hold var(), when
   * the svg attaches, before the first paint. An effect sets a new text,
   * because React warns about a layout effect on the server.
   */
  export const StyledSvg = React.forwardRef(
    (
      { svgStyle, svgProperties, ...props }: IStyledSvgProps,
      ref: React.ForwardedRef<SVGSVGElement>
    ) => {
      const svgNode = React.useRef<SVGSVGElement | null>(null);
      const styleText = React.useRef(svgStyle);
      styleText.current = svgStyle;
      React.useEffect(() => {
        setRootStyle(svgNode.current, svgStyle);
      }, [svgStyle]);
      const svgRef = React.useCallback(
        (svg: SVGSVGElement | null) => {
          svgNode.current = svg;
          setRootStyle(svg, styleText.current);
          if (typeof ref === 'function') {
            return ref(svg);
          } else if (ref) {
            ref.current = svg;
          }
        },
        [ref]
      );
      return <svg {...props} style={svgProperties} ref={svgRef} />;
    }
  );
  StyledSvg.displayName = 'LabIconStyledSvg';

  export function blankElement({
    className = '',
    container,
    label,
    title,
    tag = 'div',
    slot,
    ...styleProps
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
      container = document.createElement(tag ?? 'div');
    }
    if (label != null) {
      container.textContent = label;
    }
    Private.initContainer({ container, className, styleProps, title });

    return container;
  }

  export const blankReact = React.forwardRef(
    (
      {
        className = '',
        container,
        label,
        title,
        tag = 'div',
        ...styleProps
      }: LabIcon.IProps,
      ref: LabIcon.IReactRef
    ) => {
      // make it so that tag can be used as a jsx component
      const Tag = tag ?? 'div';

      if (container) {
        initContainer({ container, className, styleProps, title });

        return <></>;
      } else {
        // if ref is defined, we create a blank svg node and point ref to it
        return (
          <Tag
            className={classes(className, LabIconStyle.styleClass(styleProps))}
          >
            {ref && blankIcon.react({ ref })}
            {label}
          </Tag>
        );
      }
    }
  );
  blankReact.displayName = 'BlankReact';

  export function initContainer({
    container,

    className,
    styleProps,
    title
  }: {
    container: HTMLElement;
    className?: string;
    styleProps?: LabIconStyle.IProps;
    title?: string;
  }): string {
    if (title != null) {
      container.title = title;
    }
    const styleClass = LabIconStyle.styleClass(styleProps);

    if (className != null) {
      // override the container class with explicitly passed-in class + style class
      const classResolved = classes(className, styleClass);
      container.className = classResolved;
      return classResolved;
    } else if (styleClass) {
      // add the style class to the container class
      container.classList.add(styleClass);
      return styleClass;
    } else {
      return '';
    }
  }

  export function isResolvable(
    icon: LabIcon.IMaybeResolvable
  ): icon is LabIcon.IResolvable {
    return !!(
      icon &&
      (typeof icon === 'string' ||
        ((icon as LabIcon.IIcon).name && (icon as LabIcon.IIcon).svgstr))
    );
  }

  export function setTitleSvg(svgNode: HTMLElement, title: string): void {
    // add a title node to the top level svg node
    const titleNodes = svgNode.getElementsByTagName('title');
    if (titleNodes.length) {
      titleNodes[0].textContent = title;
    } else {
      const titleNode = document.createElement('title');
      titleNode.textContent = title;
      svgNode.appendChild(titleNode);
    }
  }

  function uniquifySvgIds(svgNode: HTMLElement, plan: IPlan): void {
    let suffix = '';
    const withSuffix = (value: string) =>
      value.split(SUFFIX_PLACEHOLDER).join(suffix);
    // editors already name ids this way, as Illustrator does with "Layer_1";
    // the separator is "_" because Chromium and WebKit cannot parse an id
    // that holds "-" in animation timing, as in begin="dot-3.click"
    do {
      suffix = `_${nextCount().toString(36)}`;
    } while (
      plan.attributes.some(
        ([, name, value]) =>
          name === 'id' && plan.existing.has(withSuffix(value))
      )
    );
    const nodes = svgNode.getElementsByTagName('*');
    for (const [index, name, value] of plan.attributes) {
      const node = index === 0 ? svgNode : nodes[index - 1];
      node.setAttribute(name, withSuffix(value));
    }
    for (const [name, value] of plan.properties) {
      svgNode.style.setProperty(name, withSuffix(value));
    }
  }

  /**
   * The next value of the counter that all copies of this module share.
   */
  function nextCount(): number {
    const host = window as unknown as Record<symbol, number | undefined>;
    const count = host[SUFFIX_COUNTER] ?? 0;
    const next = count >= Number.MAX_SAFE_INTEGER ? 1 : count + 1;
    host[SUFFIX_COUNTER] = next;
    return next;
  }

  /**
   * Find every id that the svg refers to and the attributes that each copy
   * changes, and rewrite the style elements of the svg for its copies.
   */
  function planCopies(svg: Element): IPlan | null {
    const nodes = [svg, ...Array.from(svg.getElementsByTagName('*'))];
    const existing = new Set<string>();
    for (const node of nodes) {
      const id = node.getAttribute('id');
      if (id) {
        existing.add(id);
      }
    }
    const styleNodes = nodes.filter(node => node.localName === 'style');
    if (!existing.size && !styleNodes.length) {
      return null;
    }
    const referenced = new Set<string>();
    const refer = (id: string): boolean => {
      if (!existing.has(id)) {
        return false;
      }
      referenced.add(id);
      return true;
    };
    const scope = styleNodes.length ? nextCount().toString() : '';
    const styles = parseStyles(nodes, styleNodes, scope);
    const changed = renameReferences(nodes, refer);
    const properties = rewriteStyleUrls(styles, refer, scope);
    // every id that a reference names gets the suffix, also one that only a
    // style element names
    nodes.forEach((node, index) => {
      const id = node.getAttributeNode('id');
      if (id && referenced.has(id.value)) {
        changed.push([index, id, id.value + SUFFIX_PLACEHOLDER]);
      }
    });
    if (styles.length) {
      const context: ISelectorContext = {
        scope,
        ids: new Set(existing),
        renamed: new Set(
          changed.filter(([, a]) => a.name === 'id').map(([, a]) => a.value)
        ),
        changed: new Set(changed.map(([, a]) => keyOf(a).toLowerCase())),
        read: new Set(),
        named: existing,
        namespaces: new Map()
      };
      if (properties.size) {
        // the root of a copy sets its custom properties in its style
        context.changed.add('style');
      }
      rewriteStyleRules(nodes, styles, context, changed);
    }
    if (!referenced.size) {
      return null;
    }
    return {
      attributes: changed.map(([index, attribute, value]) => [
        index,
        attribute.name,
        value
      ]),
      existing,
      properties: Array.from(properties.values())
    };
  }

  /**
   * Each attribute that refers to an id for which `refer` holds, and its
   * value in a copy, with the suffix placeholder after each id.
   */
  function renameReferences(
    nodes: Element[],
    refer: (id: string) => boolean
  ): [number, Attr, string][] {
    // as in href="#a"; Chromium ignores the spaces around it
    const renameFragment = (value: string) => {
      const trimmed = value.trim();
      const end = value.indexOf(trimmed) + trimmed.length;
      return trimmed[0] === '#' && refer(trimmed.slice(1))
        ? value.slice(0, end) + SUFFIX_PLACEHOLDER + value.slice(end)
        : value;
    };
    const changed: [number, Attr, string][] = [];
    nodes.forEach((node, index) => {
      const animated = node.getAttribute('attributeName');
      const animatesHref = animated === 'href' || !!animated?.endsWith(':href');
      for (const attribute of Array.from(node.attributes)) {
        const { name, value } = attribute;
        let next = value;
        if (
          attribute.localName === 'href' &&
          (attribute.namespaceURI === null ||
            attribute.namespaceURI === XLINK_NAMESPACE)
        ) {
          next = renameFragment(value);
        } else if (ID_LIST_ATTRIBUTES.has(name)) {
          next = value.replace(/[^\t\n\f\r ]+/g, id =>
            refer(id) ? id + SUFFIX_PLACEHOLDER : id
          );
        } else if (name === 'begin' || name === 'end') {
          next = value
            .split(';')
            .map(part => renameTiming(part, refer))
            .join(';');
        } else if (animatesHref && ANIMATION_VALUES.includes(name)) {
          // an animation of href, as in values="#frame1;#frame2"
          next = value.split(';').map(renameFragment).join(';');
        } else if (value.includes('(')) {
          next = edit(
            value,
            urlReferences(value, refer).map(({ idEnd }) => [
              idEnd,
              idEnd,
              SUFFIX_PLACEHOLDER
            ])
          );
        }
        if (next !== value) {
          changed.push([index, attribute, next]);
        }
      }
    });
    return changed;
  }

  /**
   * Add the placeholder after the id that a SMIL timing value names, as in
   * "dot.click+1s" or "a\.b.end": the id ends at the first "." that no "\"
   * escapes. An offset, as in "0.5s" or "-1s", names no id.
   */
  function renameTiming(value: string, refer: (id: string) => boolean): string {
    const start = value.indexOf(value.trim());
    if ('0123456789+-.'.includes(value[start] ?? '0')) {
      return value;
    }
    let id = '';
    for (let i = start; i < value.length; i++) {
      if (value[i] === '.') {
        return refer(id)
          ? value.slice(0, i) + SUFFIX_PLACEHOLDER + value.slice(i)
          : value;
      }
      id += value[i] === '\\' ? (value[++i] ?? '') : value[i];
    }
    return value;
  }

  /**
   * A style element of the svg that the browser parses, its style sheet, and
   * the rules that give initial values of registered properties.
   */
  interface IStyle {
    node: Element;
    sheet: CSSStyleSheet;
    keyframes: Map<string, string>;
    initialValues: string[];
  }

  /**
   * Parse the style elements of the svg, with the names that they define for
   * keyframes and layers made local to the icon, also in the style attributes
   * of the svg. jsdom parses none: then a style keeps its text, and an id that
   * only a style names keeps its value.
   */
  function parseStyles(
    nodes: Element[],
    styleNodes: Element[],
    scope: string
  ): IStyle[] {
    const [texts, keyframes] = renameDefinitions(
      styleNodes.map(styleText),
      scope,
      nodes[0].getAttribute('data-icon-scope')
    );
    const styles: IStyle[] = [];
    styleNodes.forEach((node, index) => {
      const sheet = parseStyleSheet(texts[index]);
      if (sheet) {
        styles.push({ node, sheet, keyframes, initialValues: [] });
      }
    });
    if (styles.length && keyframes.size) {
      for (const node of nodes) {
        if (node instanceof SVGElement || node instanceof HTMLElement) {
          renameAnimations(node.style, keyframes);
        }
      }
    }
    return styles;
  }

  /**
   * Make each url() of the rules that names an id read the id of a copy from
   * a custom property, which the copy sets on its root. Give the name and the
   * value of each property.
   */
  function rewriteStyleUrls(
    styles: IStyle[],
    refer: (id: string) => boolean,
    scope: string
  ): Map<string, [string, string]> {
    const properties = new Map<string, [string, string]>();
    const rewriteUrls = (text: string) =>
      edit(
        text,
        urlReferences(text, refer).map(({ id, start, end, idEnd }) => {
          let property = properties.get(id);
          if (!property) {
            const url =
              text.slice(start, idEnd) +
              SUFFIX_PLACEHOLDER +
              text.slice(idEnd, end);
            property = [`--jp-icon-ref-${scope}-${properties.size}`, url];
            properties.set(id, property);
          }
          // the url() itself where the root has no custom properties
          return [start, end, `var(${property[0]},${text.slice(start, end)})`];
        })
      );
    for (const style of styles) {
      style.initialValues = rewriteDeclarations(
        style.sheet,
        rewriteUrls,
        scope,
        style.keyframes
      );
    }
    return properties;
  }

  /**
   * An attribute is known by its name, or by "xlink-" and its local name.
   */
  function keyOf(attribute: Attr): string {
    return attribute.namespaceURI === XLINK_NAMESPACE
      ? `xlink-${attribute.localName}`
      : attribute.name;
  }

  /**
   * Rewrite the rules so that they style only elements of the copies, as they
   * style the svg shown inline. The rules are the same in every copy.
   */
  function rewriteStyleRules(
    nodes: Element[],
    styles: IStyle[],
    context: ISelectorContext,
    changed: [number, Attr, string][]
  ): void {
    for (const { node, sheet, initialValues } of styles) {
      rewriteSelectors(sheet, context);
      addInitialValues(sheet, context.scope, initialValues);
      setStyleText(node, serializeStyleSheet(sheet));
    }
    for (const node of nodes) {
      node.setAttribute('data-icon-scope', context.scope);
    }
    // a selector that reads an attribute that copies change reads its value
    // in the svg from data-original-*
    for (const [index, attribute] of changed) {
      const key = keyOf(attribute);
      if (context.read.has(key.toLowerCase())) {
        nodes[index].setAttribute(`data-original-${key}`, attribute.value);
      }
    }
    const rootStyle = nodes[0].getAttribute('style');
    if (rootStyle !== null && context.read.has('style')) {
      nodes[0].setAttribute('data-original-style', rootStyle);
    }
  }

  /**
   * A shim for svgstrs loaded using any loader other than raw-loader.
   * This function assumes that svgstr will look like one of:
   *
   * - the raw contents of an .svg file:
   *   <svg...</svg>
   *
   * - a data URL:
   *   data:[<mediatype>][;base64],<svg...</svg>
   *
   * See https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
   */
  export function svgstrShim(svgstr: string, strict: boolean = true): string {
    // decode any uri escaping, condense leading/lagging whitespace,
    // then match to raw svg string
    // each run of escapes on its own, so that a "%" that starts no escape, as
    // in offset="50%", leaves the escapes around it to be decoded
    const decoded = svgstr.replace(/(?:%[\da-f]{2})+/gi, run => {
      try {
        return decodeURIComponent(run);
      } catch {
        return run;
      }
    });
    const [, base64, raw] = decoded
      .replace(
        // \s includes \n, so />\s*\n/ is ambiguous and causes super-linear backtracking.
        // The explicit list is \s minus \n, ensuring only one way to reach the \n.
        // See: https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-super-linear-backtracking.html
        // and https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions/Cheatsheet
        />[\t\v\f\r \xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]*\n\s*</g,
        '><'
      )
      .replace(/\s*\n\s*/g, ' ')
      .match(
        strict
          ? // match based on data url schema
            /^(?:data:.*?(;base64)?,)?(.*)/
          : // match based on open of svg tag
            /(?:(base64).*)?(<svg.*)/
      )!;

    // decode from base64, if needed
    return base64 ? atob(raw) : raw;
  }

  /**
   * TODO: figure out story for independent Renderers.
   * Base implementation of IRenderer.
   */
  export class Renderer implements VirtualElement.IRenderer {
    constructor(
      protected _icon: LabIcon,
      protected _rendererOptions?: LabIcon.IRendererOptions
    ) {}

    render(container: HTMLElement, options?: LabIcon.IRendererOptions): void {}
    unrender?(container: HTMLElement, options?: LabIcon.IRendererOptions): void;
  }

  /**
   * TODO: figure out story for independent Renderers.
   * Implementation of IRenderer that creates the icon svg node
   * as a DOM element.
   */
  export class ElementRenderer extends Renderer {
    render(container: HTMLElement, options?: LabIcon.IRendererOptions): void {
      let label = options?.children?.[0];
      // narrow type of label
      if (typeof label !== 'string') {
        label = undefined;
      }

      this._icon.element({
        container,
        label,
        ...this._rendererOptions?.props,
        ...options?.props
      });
    }
  }

  /**
   * TODO: figure out story for independent Renderers.
   * Implementation of IRenderer that creates the icon svg node
   * as a React component.
   */
  export class ReactRenderer extends Renderer {
    render(container: HTMLElement, options?: LabIcon.IRendererOptions): void {
      let label = options?.children?.[0];
      // narrow type of label
      if (typeof label !== 'string') {
        label = undefined;
      }

      const icon = this._icon;

      if (this._rootDOM !== null) {
        this._rootDOM.unmount();
      }
      this._rootDOM = createRoot(container);
      this._rootDOM.render(
        <icon.react
          container={container}
          label={label}
          {...{ ...this._rendererOptions?.props, ...options?.props }}
        />
      );
    }

    unrender(container: HTMLElement): void {
      if (this._rootDOM !== null) {
        this._rootDOM.unmount();
        this._rootDOM = null;
      }
    }

    private _rootDOM: Root | null = null;
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
