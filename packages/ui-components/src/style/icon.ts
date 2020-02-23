// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { style as typestyleClass } from 'typestyle/lib';
import { NestedCSSProperties } from 'typestyle/lib/types';

export namespace LabIcon {
  /**
   * - breadCrumb: The path icons above the filebrowser
   * - commandPaletteHeader: The icon to the right of palette section headers
   * - commandPaletteItem: The icon next to a palette item
   * - launcherCard: The icons for the cards at the bottom of the launcher
   * - launcherSection: The icons to left of the Launcher section headers
   * - listing: The icons to the left of the filebrowser listing items
   * - listingHeaderItem: Caret icons used to show sort order in listing column headers
   * - mainAreaTab: The icons in the tabs above the main area/the tabManager in the sidebar
   * - menuItem: The icon next to a menu item
   * - runningItem: The icon next to an item in the Running sidebar
   * - select: The caret icon on the left side of a dropdown select element
   * - settingsEditor: The icons to the left of each section of the settings editor
   * - sideBar: The icons for the sidebar (default to the left of the main window)
   * - splash: The icon used for the splash screen
   * - statusBar: The icons in the status bar
   * - toolbarButton: The icon shown on a toolbar button
   */
  type IStyleBuiltin =
    | 'breadCrumb'
    | 'commandPaletteHeader'
    | 'commandPaletteItem'
    | 'launcherCard'
    | 'launcherSection'
    | 'listing'
    | 'listingHeaderItem'
    | 'mainAreaTab'
    | 'menuItem'
    | 'runningItem'
    | 'select'
    | 'settingsEditor'
    | 'sideBar'
    | 'splash'
    | 'statusBar'
    | 'toolbarButton';

  type IPosition =
    | 'center'
    | 'top'
    | 'right'
    | 'bottom'
    | 'left'
    | 'top right'
    | 'bottom right'
    | 'bottom left'
    | 'top left';

  // type ISize =
  //   | 'small'
  //   | 'normal'
  //   | 'large'
  //   | 'xlarge';

  /**
   * Collections of CSS props that can be fed directly to
   * typestyle's style() function
   */
  interface IStyleLiteralPure {
    /**
     * CSS properties that will be applied to the outer container
     * element via a typestyle class
     */
    containerStyle?: NestedCSSProperties;

    /**
     * CSS properties that will be applied to the inner svg
     * element via a typestyle class
     */
    elementStyle?: NestedCSSProperties;

    /**
     * FUTURE: CSS properties that will be applied to the label
     * element, if any, via a typestyle class
     */
    // labelStyle?: NestedCSSProperties;
  }

  /**
   * Collections of CSS props plus some custom options
   */
  interface IStyleLiteral extends IStyleLiteralPure {
    /**
     * How to position the inner svg element,
     * relative to the outer container
     */
    elementPosition?: IPosition;

    /**
     * FUTURE: how to position the outer container
     */
    // containerPosition?: IPosition;

    /**
     * FUTURE: the size of the inner svg element
     */
    // elementSize?: ISize

    /**
     * FUTURE: how to position the label element (if any),
     * relative to the outer container
     */
    // labelPosition?: IPosition;
  }

  /**
   * The actual type of the iconStyleClass arg
   */
  type IStyle = IStyleBuiltin | IStyleLiteral;

  export interface IStyleProps extends NestedCSSProperties, IStyleLiteral {
    /**
     * the kind of the icon, associated with a builtin stylesheet
     */
    kind?: IStyleBuiltin;

    /**
     * @deprecated use elementPosition instead
     */
    justify?: IPosition;
  }

  /**
   * The builtin styles
   */
  export const builtinStyles: { [k in IStyleBuiltin]: IStyleLiteral } = {
    breadCrumb: {
      containerStyle: {
        $nest: {
          // `&` will be substituted for the generated classname (interpolation)
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
      },
      elementStyle: {
        borderRadius: 'var(--jp-border-radius)',
        cursor: 'pointer',
        margin: '0px 2px',
        padding: '0px 2px',
        height: '16px',
        width: '16px',
        verticalAlign: 'middle'
      }
    },

    commandPaletteHeader: {
      containerStyle: {
        height: '14px',
        margin: '0 14px 0 auto'
      },
      elementStyle: {
        height: '14px',
        width: '14px'
      },
      elementPosition: 'center'
    },

    commandPaletteItem: {
      elementStyle: {
        height: '16px',
        width: '16px'
      },
      elementPosition: 'center'
    },

    launcherCard: {
      containerStyle: {
        height: '68px'
      },
      elementStyle: {
        height: '52px',
        width: '52px'
      },
      elementPosition: 'center'
    },

    launcherSection: {
      containerStyle: {
        boxSizing: 'border-box',
        marginRight: '12px'
      },
      elementStyle: {
        height: '32px',
        width: '32px'
      },
      elementPosition: 'center'
    },

    listing: {
      containerStyle: {
        flex: '0 0 20px',
        marginRight: '4px',
        position: 'relative'
      },
      elementStyle: {
        height: '16px',
        width: '16px'
      },
      elementPosition: 'center'
    },

    listingHeaderItem: {
      containerStyle: {
        display: 'inline',
        height: '16px',
        width: '16px'
      },
      elementStyle: {
        height: 'auto',
        margin: '-2px 0 0 0',
        width: '20px'
      },
      elementPosition: 'center'
    },

    mainAreaTab: {
      containerStyle: {
        $nest: {
          '.lm-DockPanel-tabBar &': {
            marginRight: '4px'
          },
          '#tab-manager &': {
            marginRight: '2px',
            position: 'relative'
          }
        }
      },
      elementStyle: {
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
      },
      elementPosition: 'center'
    },

    menuItem: {
      containerStyle: {
        display: 'inline-block',
        verticalAlign: 'middle'
      },
      elementStyle: {
        height: '16px',
        width: '16px'
      },
      elementPosition: 'center'
    },

    runningItem: {
      containerStyle: {
        margin: '0px 4px 0px 12px'
      },
      elementStyle: {
        height: '16px',
        width: '16px'
      },
      elementPosition: 'center'
    },

    select: {
      containerStyle: {
        pointerEvents: 'none'
      },
      elementStyle: {
        position: 'absolute',
        height: 'auto',
        width: '16px'
      },
      elementPosition: 'center'
    },

    settingsEditor: {
      containerStyle: {
        display: 'inline-block',
        flex: '0 0 20px',
        marginLeft: '2px',
        marginRight: '1px',
        position: 'relative',
        height: '20px',
        width: '20px'
      },
      elementStyle: {
        height: '16px',
        width: '16px'
      },
      elementPosition: 'center'
    },

    sideBar: {
      containerStyle: {
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
      },
      elementStyle: {
        width: '20px'
      },
      elementPosition: 'center'
    },

    splash: {
      containerStyle: {
        animation: '0.3s fade-in linear forwards',
        height: '100%',
        width: '100%',
        zIndex: 1
      },
      elementStyle: {
        width: '100px'
      },
      elementPosition: 'center'
    },

    statusBar: {
      elementStyle: {
        left: '0px',
        top: '0px',
        height: '18px',
        width: '20px',
        position: 'relative'
      },
      elementPosition: 'center'
    },

    toolbarButton: {
      containerStyle: {
        display: 'inline-block',
        margin: 'auto',
        verticalAlign: 'middle'
      },
      elementStyle: {
        height: '16px',
        width: '16px'
      },
      elementPosition: 'center'
    }
  };

  function _elementPositionFactory(extra: NestedCSSProperties) {
    return {
      containerStyle: {
        alignItems: 'center',
        display: 'flex'
      },
      elementStyle: {
        display: 'block',
        ...extra
      }
    };
  }

  /**
   * Styles to help with positioning
   */
  export const positionStyles: { [k in IPosition]: IStyleLiteralPure } = {
    center: _elementPositionFactory({ margin: '0 auto', width: '100%' }),

    top: _elementPositionFactory({ margin: '0 0 auto 0' }),
    right: _elementPositionFactory({ margin: '0 0 0 auto' }),
    bottom: _elementPositionFactory({ margin: 'auto 0 0 0' }),
    left: _elementPositionFactory({ margin: '0 auto 0 0' }),

    'top right': _elementPositionFactory({ margin: '0 0 auto auto' }),
    'bottom right': _elementPositionFactory({ margin: 'auto 0 0 auto' }),
    'bottom left': _elementPositionFactory({ margin: 'auto auto 0 0' }),
    'top left': _elementPositionFactory({ margin: '0 auto 0 auto' })
  };

  // function _elementSizeFactory(size: string) {
  //   return {
  //     elementStyle: {
  //       height: size,
  //       width: size
  //     }
  //   }
  // }

  // /**
  //  * styles that establish some default sizes
  //  */
  // export const styleSizes: { [k in ISize]: IStyleLiteralPure } = {
  //   small: _elementSizeFactory('14px'),
  //   normal: _elementSizeFactory('16px'),
  //   large: _elementSizeFactory('20px'),
  //   xlarge: _elementSizeFactory('24px')
  // }

  const _builtinStylesCache = Object.keys(builtinStyles).reduce(
    (c: any, k: IStyleBuiltin) => {
      c[k] = resolveStyle(builtinStyles[k]);
      return c;
    },
    {}
  );

  /**
   * Merge two or more pure (CSS props only) icon styles
   */
  function mergeStyles(styles: IStyleLiteralPure[]): IStyleLiteralPure {
    return {
      containerStyle: Object.assign({}, ...styles.map(s => s.containerStyle)),
      elementStyle: Object.assign({}, ...styles.map(s => s.elementStyle))
    };
  }

  /**
   * Resolve an icon style into a "pure" style that contains only
   * collections of CSS props that can be passed directly into typestyle
   */
  function resolveStyle(style: IStyle): IStyleLiteralPure {
    if (typeof style === 'string') {
      // return pre-resolved style
      return _builtinStylesCache[style];
    }

    let styles = [style];
    if (style.elementPosition) {
      styles.unshift(positionStyles[style.elementPosition]);
    }

    return mergeStyles(styles);
  }

  /**
   * Resolve and merge multiple icon styles
   */
  function resolveStyles(styles: (IStyle | undefined)[]) {
    return mergeStyles(styles.filter(Boolean).map(s => resolveStyle(s!)));
  }

  /**
   * Resolve a pure icon style into a typestyle class
   */
  function resolveStyleClass(style: IStyleLiteralPure): string {
    return typestyleClass({
      ...style.containerStyle,
      $nest: {
        ...style.containerStyle?.$nest,
        ['svg']: style.elementStyle
      }
    });
  }

  /**
   * Get a typestyle class, given a given set of icon styling props
   */
  export function styleClass(props?: IStyleProps): string {
    if (!props || Object.keys(props).length === 0) {
      // props is empty
      return '';
    }

    const {
      containerStyle,
      elementStyle,
      elementPosition,
      kind,
      justify,
      ...elementStyleExtra
    } = props;
    // DEPRECATED: alias justify => elementPosition
    if (!elementPosition) {
      props.elementPosition = justify;
    }
    // merge any extra element style props
    props.elementStyle = { ...props.elementStyle, ...elementStyleExtra };

    return resolveStyleClass(resolveStyles([kind, props]));
  }
}
