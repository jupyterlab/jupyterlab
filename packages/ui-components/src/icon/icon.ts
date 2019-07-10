import { Token } from '@phosphor/coreutils';

import { nameFromPath } from '../utils';
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
    name: string;
    className?: string;
    svg: string;
  }

  /**
   * The options used when creating an icon node
   */
  export interface INodeOptions extends IIconStyle {
    name: string;
    className?: string;
    title?: string;
  }

  /**
   * Import all svgs from a directory. The input argument should be
   * of the form `require.context('raw-loader!<path>', true, /\.svg$/)`.
   * <path> should be a string literal path, as this is needed by `require`.
   */
  export function importSvgs(r: any, exclude: string[] = []): IModel[] {
    const excset = new Set(exclude);

    return r.keys().reduce((svgs: IModel[], item: string, index: number) => {
      const name = nameFromPath(item);
      if (!excset.has(name)) {
        svgs.push({ name: name, svg: r(item).default });
      }
      return svgs;
    }, []);
  }

  // create the array of default icon models
  let icons: IModel[];
  try {
    // require.context is supplied by Webpack, and doesn't play nice with jest
    icons = importSvgs(
      require.context('raw-loader!../../style/icons', true, /\.svg$/),
      ['bad', 'blank']
    );
  } catch (e) {
    // fallback for jest tests
    icons = [];
  }
  export const defaultIcons: ReadonlyArray<IModel> = icons;
}
