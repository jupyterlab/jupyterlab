// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { style } from 'typestyle/lib';
import { NestedCSSProperties } from 'typestyle/lib/types';

type iconKindType = 'listing' | 'sideBar' | 'statusBar' | 'tab' | 'unset';

export interface IIconStyle extends NestedCSSProperties {
  /**
   * center the icon svg in its container
   */
  center?: boolean;

  /**
   * the kind of the icon, associated with a default stylesheet
   */
  kind?: iconKindType;
}

const iconContainerCSSCenter: NestedCSSProperties = {
  alignItems: 'center',
  display: 'flex !important'
};

const iconCSSCenter: NestedCSSProperties = {
  display: 'block',
  margin: '0 auto',
  width: '100%'
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

const iconCSSTab: NestedCSSProperties = {
  height: '14px'
};

const iconCSSKind: { [k in iconKindType]: NestedCSSProperties } = {
  listing: iconCSSListing,
  sideBar: iconCSSSideBar,
  statusBar: iconCSSStatusBar,
  tab: iconCSSTab,
  unset: {}
};

function iconCSS(props: IIconStyle): NestedCSSProperties {
  const { kind, center, ...propsCSS } = props;

  return {
    ...(center ? iconCSSCenter : {}),
    ...(kind ? iconCSSKind[kind] : {}),
    ...propsCSS
  };
}

/**
 * For setting the style on the container of an svg node representing an icon
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
 * For setting the style directly on the svg node representing an icon
 */
export const iconStyleFlat = (props: IIconStyle): string => {
  return style(iconCSS(props));
};
