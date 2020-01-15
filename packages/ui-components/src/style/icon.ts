// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { style } from 'typestyle/lib';
import { NestedCSSProperties } from 'typestyle/lib/types';

/**
 * - breadCrumb: The path icons above the filebrowser
 * - dockPanelBar: The tab icons above the main area
 * - launcherCard: The icons for the cards at the bottom of the launcher
 * - launcherSection: The icons to left of the Launcher section headers
 * - listing: The icons to the left of the filebrowser listing items
 * - settingsEditor: The icons to the left of each section of the settings editor
 * - sideBar: The icons for the sidebar (default to the left of the main window)
 * - splash: The icon used for the splash screen
 * - tabManager: The icons for the tabManager in the sidebar
 */
export type IconKindType =
  | 'breadCrumb'
  | 'launcherCard'
  | 'launcherSection'
  | 'listing'
  | 'listingHeaderItem'
  | 'mainAreaTab'
  | 'runningItem'
  | 'select'
  | 'settingsEditor'
  | 'sideBar'
  | 'splash'
  | 'statusBar'
  | 'toolbarButton';

export type IconJustifyType = 'center' | 'left' | 'right';

export interface IIconStyle extends NestedCSSProperties {
  /**
   * the kind of the icon, associated with a default stylesheet
   */
  kind?: IconKindType;

  /**
   * how to justify the icon
   */
  justify?: IconJustifyType;
}

/**
 * icon kind specific styles
 */
const iconCSSBreadCrumb: NestedCSSProperties = {
  borderRadius: 'var(--jp-border-radius)',
  cursor: 'pointer',
  margin: '0px 2px',
  padding: '0px 2px',
  height: '16px',
  width: '16px',
  verticalAlign: 'middle'
};

const iconCSSLauncherCard: NestedCSSProperties = {
  height: '52px',
  width: '52px'
};

const iconCSSLauncherSection: NestedCSSProperties = {
  height: '32px',
  width: '32px'
};

const iconCSSListing: NestedCSSProperties = {
  height: '16px',
  width: '16px'
};

const iconCSSlistingHeaderItem: NestedCSSProperties = {
  height: 'auto',
  margin: '-2px 0 0 0',
  width: '20px'
};

const iconCSSMainAreaTab: NestedCSSProperties = {
  $nest: {
    '.lm-DockPanel-tabBar &': {
      height: '14px',
      width: '14px'
    },
    '#tab-manager &': {
      height: '16px',
      width: '16px'
    }
  }
};

const iconCSSRunningItem: NestedCSSProperties = {
  height: '16px',
  width: '16px'
};

const iconCSSSelect: NestedCSSProperties = {
  position: 'absolute',
  height: 'auto',
  width: '16px'
};

const iconCSSSettingsEditor: NestedCSSProperties = {
  height: '16px',
  width: '16px'
};

const iconCSSSideBar: NestedCSSProperties = {
  width: '20px'
};

const iconCSSSplash: NestedCSSProperties = {
  width: '100px'
};

const iconCSSStatusBar: NestedCSSProperties = {
  left: '0px',
  top: '0px',
  height: '18px',
  width: '20px',
  position: 'relative'
};

const iconCSSToolbarButton: NestedCSSProperties = {
  height: '16px',
  width: '16px'
};

const iconCSSKind: { [k in IconKindType]: NestedCSSProperties } = {
  breadCrumb: iconCSSBreadCrumb,
  launcherCard: iconCSSLauncherCard,
  launcherSection: iconCSSLauncherSection,
  listing: iconCSSListing,
  listingHeaderItem: iconCSSlistingHeaderItem,
  mainAreaTab: iconCSSMainAreaTab,
  runningItem: iconCSSRunningItem,
  select: iconCSSSelect,
  settingsEditor: iconCSSSettingsEditor,
  sideBar: iconCSSSideBar,
  splash: iconCSSSplash,
  statusBar: iconCSSStatusBar,
  toolbarButton: iconCSSToolbarButton
};

const containerCSSBreadCrumb: NestedCSSProperties = {
  // `&` will be substituted for the generated classname (interpolation)
  $nest: {
    '&:first-child svg': {
      bottom: '1px',
      marginLeft: '0px',
      position: 'relative'
    },
    '&:hover': {
      backgroundColor: 'var(--jp-layout-color2)'
    },
    ['.jp-mod-dropTarget&']: {
      backgroundColor: 'var(--jp-brand-color2)',
      opacity: 0.7
    }
  }
};

const containerCSSLauncherCard: NestedCSSProperties = {
  height: '68px'
};

const containerCSSLauncherSection: NestedCSSProperties = {
  boxSizing: 'border-box',
  marginRight: '12px'
};

const containerCSSListing: NestedCSSProperties = {
  flex: '0 0 20px',
  marginRight: '4px',
  position: 'relative'
};

const containerCSSListingHeaderItem: NestedCSSProperties = {
  display: 'inline',
  height: '16px',
  width: '16px'
};

/**
 * container kind specific styles
 */
const containerCSSMainAreaTab: NestedCSSProperties = {
  $nest: {
    '.lm-DockPanel-tabBar &': {
      marginRight: '4px'
    },
    '#tab-manager &': {
      marginRight: '2px',
      position: 'relative'
    }
  }
};

const containerCSSRunningItem: NestedCSSProperties = {
  margin: '0px 4px 0px 12px'
};

const containerCSSSelect: NestedCSSProperties = {
  pointerEvents: 'none'
};

const containerCSSSettingsEditor: NestedCSSProperties = {
  display: 'inline-block',
  flex: '0 0 20px',
  marginLeft: '2px',
  marginRight: '1px',
  position: 'relative',
  height: '20px',
  width: '20px'
};

const containerCSSSideBar: NestedCSSProperties = {
  // `&` will be substituted for the generated classname (interpolation)
  $nest: {
    // left sidebar tab divs
    '.jp-SideBar.jp-mod-left .lm-TabBar-tab &': {
      transform: 'rotate(90deg)'
    },
    // left sidebar currently selected tab div
    '.jp-SideBar.jp-mod-left .lm-TabBar-tab.lm-mod-current &': {
      transform:
        'rotate(90deg)\n' +
        '    translate(\n' +
        '      calc(-0.5 * var(--jp-border-width)),\n' +
        '      calc(-0.5 * var(--jp-border-width))\n' +
        '    )'
    },

    // right sidebar tab divs
    '.jp-SideBar.jp-mod-right .lm-TabBar-tab &': {
      transform: 'rotate(-90deg)'
    },
    // right sidebar currently selected tab div
    '.jp-SideBar.jp-mod-right .lm-TabBar-tab.lm-mod-current &': {
      transform:
        'rotate(-90deg)\n' +
        '    translate(\n' +
        '      calc(0.5 * var(--jp-border-width)),\n' +
        '      calc(-0.5 * var(--jp-border-width))\n' +
        '    )'
    }
  }
};

const containerCSSSplash: NestedCSSProperties = {
  animation: '0.3s fade-in linear forwards',
  height: '100%',
  width: '100%',
  zIndex: 1
};

const containerCSSToolbarButton: NestedCSSProperties = {
  display: 'inline-block',
  margin: 'auto',
  verticalAlign: 'middle'
};

const containerCSSKind: { [k in IconKindType]: NestedCSSProperties } = {
  breadCrumb: containerCSSBreadCrumb,
  launcherCard: containerCSSLauncherCard,
  launcherSection: containerCSSLauncherSection,
  listing: containerCSSListing,
  listingHeaderItem: containerCSSListingHeaderItem,
  mainAreaTab: containerCSSMainAreaTab,
  runningItem: containerCSSRunningItem,
  select: containerCSSSelect,
  settingsEditor: containerCSSSettingsEditor,
  sideBar: containerCSSSideBar,
  splash: containerCSSSplash,
  statusBar: {},
  toolbarButton: containerCSSToolbarButton
};

/**
 * styles for justifying a node inside of a container
 */
const iconCSSCenter: NestedCSSProperties = {
  display: 'block',
  margin: '0 auto',
  width: '100%'
};

const iconCSSLeft: NestedCSSProperties = {
  display: 'block',
  margin: '0 auto 0 0'
};

const iconCSSRight: NestedCSSProperties = {
  display: 'block',
  margin: '0 0 0 auto'
};

const iconCSSJustify: { [k in IconJustifyType]: NestedCSSProperties } = {
  center: iconCSSCenter,
  left: iconCSSLeft,
  right: iconCSSRight
};

const containerCSSCenter: NestedCSSProperties = {
  alignItems: 'center',
  display: 'flex'
};

const containerCSSLeft: NestedCSSProperties = {
  alignItems: 'center',
  display: 'flex'
};

const containerCSSRight: NestedCSSProperties = {
  alignItems: 'center',
  display: 'flex'
};

const containerCSSJustify: { [k in IconJustifyType]: NestedCSSProperties } = {
  center: containerCSSCenter,
  left: containerCSSLeft,
  right: containerCSSRight
};

/**
 * for putting together the icon kind style with any user input styling,
 * as well as styling from optional flags like `center`
 */
function iconCSS(props: IIconStyle): NestedCSSProperties {
  const { kind, justify, ...propsCSS } = props;

  return {
    ...(justify ? iconCSSJustify[justify] : {}),
    ...(kind ? iconCSSKind[kind] : {}),
    ...propsCSS
  };
}

/**
 * for putting together the container kind style with any
 * styling from optional flags like `center`
 */
function containerCSS(props: IIconStyle): NestedCSSProperties {
  const { kind, justify } = props;

  return {
    ...(justify ? containerCSSJustify[justify] : {}),
    ...(kind ? containerCSSKind[kind] : {})
  };
}

/**
 * for setting the style on the container of an svg node representing an icon
 */
export const iconStyle = (props?: IIconStyle): string => {
  if (!props || Object.keys(props).length === 0) {
    return '';
  }

  const conCSS = containerCSS(props);

  return style({
    ...conCSS,
    $nest: {
      ...conCSS.$nest,
      ['svg']: iconCSS(props)
    }
  });
};

/**
 * for setting the style directly on the svg node representing an icon
 */
export const iconStyleFlat = (props?: IIconStyle): string => {
  if (!props || Object.keys(props).length === 0) {
    return '';
  }

  return style(iconCSS(props));
};
