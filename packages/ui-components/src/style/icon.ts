// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { style as typestyleClass } from 'typestyle/lib';
import { NestedCSSProperties } from 'typestyle/lib/types';

export namespace LabIconStyle {
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
  type IBuiltin =
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

  type ISize = 'small' | 'normal' | 'large' | 'xlarge';

  /**
   * Collections of CSS props that can be fed directly to
   * typestyle's style() function
   */
  interface IStylePure {
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

  interface IStyleOptions {
    /**
     * How to position the inner svg element,
     * relative to the outer container
     */
    elementPosition?: IPosition;

    /**
     * the size of the inner svg element. Can be any of:
     *   - 'small': 14px x 14px
     *   - 'normal': 16px x 16px
     *   - 'large': 20px x 20px
     *   - 'xlarge': 24px x 24px
     */
    elementSize?: ISize;

    /**
     * FUTURE: how to position the label element (if any),
     * relative to the outer container
     */
    // labelPosition?: IPosition;
  }

  /**
   * Collections of CSS props plus some custom options
   */
  export interface IStyle extends IStylePure {
    options?: IStyleOptions;
  }

  /**
   * Type to help with resolving a style that might be a string
   */
  type IStyleResolvable = IStyle | IBuiltin;

  export interface IProps extends NestedCSSProperties, IStyleOptions {
    /**
     * the kind of the icon, associated with a builtin stylesheet
     */
    kind?: IStyleResolvable | IStyleResolvable[];

    /**
     * @deprecated use elementPosition instead
     */
    justify?: IPosition;
  }

  /**
   * The kind (ie builtin) styles
   */
  export const kindStyles: { [k in IBuiltin]: IStyle } = {
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
      options: {
        elementPosition: 'center'
      }
    },

    commandPaletteItem: {
      elementStyle: {
        height: '16px',
        width: '16px'
      },
      options: {
        elementPosition: 'center'
      }
    },

    launcherCard: {
      containerStyle: {
        height: '68px'
      },
      elementStyle: {
        height: '52px',
        width: '52px'
      },
      options: {
        elementPosition: 'center'
      }
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
      options: {
        elementPosition: 'center'
      }
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
      options: {
        elementPosition: 'center'
      }
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
      options: {
        elementPosition: 'center'
      }
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
      options: {
        elementPosition: 'center'
      }
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
      options: {
        elementPosition: 'center'
      }
    },

    runningItem: {
      containerStyle: {
        margin: '0px 4px 0px 12px'
      },
      elementStyle: {
        height: '16px',
        width: '16px'
      },
      options: {
        elementPosition: 'center'
      }
    },

    select: {
      containerStyle: {
        pointerEvents: 'none'
      },
      elementStyle: {
        position: 'absolute',
        height: 'auto',
        width: '16px'
      }
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
      options: {
        elementPosition: 'center'
      }
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
      options: {
        elementPosition: 'center'
      }
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
      options: {
        elementPosition: 'center'
      }
    },

    statusBar: {
      elementStyle: {
        left: '0px',
        top: '0px',
        height: '18px',
        width: '20px',
        position: 'relative'
      }
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
      options: {
        elementPosition: 'center'
      }
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
  export const positionStyles: { [k in IPosition]: IStyle } = {
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

  function _elementSizeFactory(size: string) {
    return {
      elementStyle: {
        height: size,
        width: size
      }
    };
  }

  /**
   * styles that establish some default sizes
   */
  export const sizeStyles: { [k in ISize]: IStylePure } = {
    small: _elementSizeFactory('14px'),
    normal: _elementSizeFactory('16px'),
    large: _elementSizeFactory('20px'),
    xlarge: _elementSizeFactory('24px')
  };

  /**
   * Merge two or more pure (CSS props only) icon styles
   */
  function mergeStyles(styles: IStyle[]): IStylePure {
    return {
      containerStyle: Object.assign({}, ...styles.map(s => s.containerStyle)),
      elementStyle: Object.assign({}, ...styles.map(s => s.elementStyle))
    };
  }

  function resolveKind(
    kind: IStyleResolvable | IStyleResolvable[] | undefined
  ): IStyle[] {
    if (!kind) {
      return [];
    }

    if (!Array.isArray(kind)) {
      // wrap in array
      kind = [kind];
    }

    return kind.map(k => (typeof k === 'string' ? kindStyles[k] : k));
  }

  /**
   * Resolve and merge multiple icon styles
   */
  function resolveStyles(styles: IStyle[]) {
    const options: IStyleOptions = Object.assign(
      {},
      ...styles.map(s => s.options)
    );

    if (options.elementPosition) {
      styles.unshift(positionStyles[options.elementPosition]);
    }

    if (options.elementSize) {
      styles.unshift(sizeStyles[options.elementSize]);
    }

    return mergeStyles(styles);
  }

  /**
   * Resolve a pure icon style into a typestyle class
   */
  function resolveStyleClass(style: IStylePure): string {
    return typestyleClass({
      ...style.containerStyle,
      $nest: {
        ...style.containerStyle?.$nest,
        ['svg']: style.elementStyle
      }
    });
  }

  // cache style classes for builtin kinds with simple options
  let _styleCache = new Map<string, string>();

  /**
   * Get a typestyle class, given a given set of icon styling props
   */
  export function styleClass(props?: IProps): string {
    if (!props || Object.keys(props).length === 0) {
      // props is empty
      return '';
    }

    let {
      elementPosition,
      elementSize,
      kind,
      justify,
      ...elementStyle
    } = props;

    // DEPRECATED: alias justify => elementPosition
    if (!elementPosition) {
      elementPosition = justify;
    }

    // add option args with defined values to overrides
    const options = {
      ...(elementPosition && { elementPosition }),
      ...(elementSize && { elementSize })
    };

    // try to look up the style class in the cache
    const cacheable =
      typeof kind === 'string' && Object.keys(elementStyle).length === 0;
    const cacheKey = cacheable ? [kind, elementPosition].join(',') : '';
    if (cacheable && _styleCache.has(cacheKey)) {
      return _styleCache.get(cacheKey)!;
    }

    // resolve kind to an array of styles, then stick overrides on the end
    const styles = resolveKind(kind);
    styles.push({ elementStyle, options });

    // apply style options/merge styles, then convert to typestyle class
    const cls = resolveStyleClass(resolveStyles(styles));

    if (cacheable) {
      // store in cache for later reuse
      _styleCache.set(cacheKey, cls);
    }

    return cls;
  }
}
