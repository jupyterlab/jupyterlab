import { Token } from '@lumino/coreutils';

import { IIconStyle } from '../style/icon';
import React from 'react';

/**
 * The interface for an object that keeps a registry of inline
 * svg icons. Has methods for setting up inline svg icons as
 * either `HTMLElement` or `ReactElement`
 */
export interface IIconRegistry {
  /**
   * Add the raw text representation of an svg icon to this registry
   */
  addIcon(...icons: Icon.IModel[]): void;

  /**
   * Check if any icon of name `name` has been registered.
   * Exact matches only
   */
  contains(name: string): boolean;

  /**
   * Get the icon as an HTMLElement of tag <svg><svg/>
   */
  icon(
    props: Icon.INodeOptions & { container: HTMLElement }
  ): HTMLElement | null;

  /**
   * Get the icon as a ReactElement of tag <tag><svg><svg/><tag/>
   */
  iconReact(
    props: Icon.INodeOptions & { tag?: 'div' | 'span' }
  ): React.ReactElement;
}

/**
 * The IIconRegistry token.
 */
export const IIconRegistry = new Token<IIconRegistry>(
  '@jupyterlab/ui-components:IIconRegistry'
);

export namespace Icon {
  /**
   * A representation of the resources underlying an inline svg icon
   */
  export interface IModel {
    /**
     * The icon name. For a 'foo-bar.svg' file, the icon name is 'foo-bar'.
     */
    name: string;

    /**
     * Manually set the className corresponding to the icon name. By default,
     * the className is generated from the name: 'foo-bar' -> 'jp-FooBarIcon'
     */
    className?: string;

    /**
     * A string containing the html corresponding to an SVG element
     */
    svg: string;
  }

  /**
   * The options used when creating an icon node
   */
  export interface INodeOptions extends IIconStyle {
    /**
     * The icon name. For a 'foo-bar.svg' file, the icon name is 'foo-bar'.
     * For backwards compatibility, 'jp-FooBarIcon' is also a valid icon name.
     *
     * TODO: until Jlab 2.0
     * If fallback is set, the name is added to the className
     * of the resulting icon node
     */
    name: string;

    /**
     * Extra classNames, used in addition to the typestyle className
     */
    className?: string;

    /**
     * Icon title
     */
    title?: string;

    /**
     * If true, if icon name resolution fails, fallback to old
     * icon handling behavior.
     *
     * TODO: remove in Jlab 2.0
     */
    fallback?: boolean;
  }
}
