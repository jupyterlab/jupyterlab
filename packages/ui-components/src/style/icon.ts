// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { style } from 'typestyle/lib';
import { NestedCSSProperties } from 'typestyle/lib/types';

export type IconKindType =
  | 'dockPanelBar'
  | 'listing'
  | 'sideBar'
  | 'statusBar'
  | 'unset';

export interface IIconStyle extends NestedCSSProperties {
  /**
   * center the icon svg in its container
   */
  center?: boolean;

  /**
   * the kind of the icon, associated with a default stylesheet
   */
  kind?: IconKindType;
}

/**
 * styles for centering node inside of containers
 */
const iconContainerCSSCenter: NestedCSSProperties = {
  alignItems: 'center',
  display: 'flex !important'
};

const iconCSSCenter: NestedCSSProperties = {
  display: 'block',
  margin: '0 auto',
  width: '100%'
};

/**
 * icon kind specific styles
 */
const iconCSSDockPanelBar: NestedCSSProperties = {
  height: '14px'
};

const iconCSSListing: NestedCSSProperties = {
  height: '16px'
};

const iconCSSSideBar: NestedCSSProperties = {
  width: '20px'
};

const iconCSSStatusBar: NestedCSSProperties = {
  left: '0px',
  top: '0px',
  height: '18px',
  width: '20px',
  position: 'relative'
};

const iconCSSKind: { [k in IconKindType]: NestedCSSProperties } = {
  dockPanelBar: iconCSSDockPanelBar,
  listing: iconCSSListing,
  sideBar: iconCSSSideBar,
  statusBar: iconCSSStatusBar,
  unset: {}
};

/**
 * for putting together the icon kind style with any user input styling,
 * as well as styling from optional flags like `center`
 */
function iconCSS(props: IIconStyle): NestedCSSProperties {
  const { kind, center, ...propsCSS } = props;

  return {
    ...(center ? iconCSSCenter : {}),
    ...(kind ? iconCSSKind[kind] : {}),
    ...propsCSS
  };
}

/**
 * for setting the style on the container of an svg node representing an icon
 */
export const iconStyle = (props: IIconStyle): string => {
  return style({
    ...(props.center ? iconContainerCSSCenter : {}),
    $nest: {
      ['svg']: iconCSS(props)
    }
  });
};

/**
 * for setting the style directly on the svg node representing an icon
 */
export const iconStyleFlat = (props: IIconStyle): string => {
  return style(iconCSS(props));
};
