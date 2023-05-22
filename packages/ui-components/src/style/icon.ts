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
   * Options that function as a shorthand for compound CSS properties,
   * such as the set of props required to center an svg inside
   * of a parent node
   */
  interface ISheetOptions {
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
   * Stylesheet with a collection of CSS props for each node
   * in an icon, plus some custom options
   */
  interface ISheet {
    /**
     * CSS properties that will be applied to the outer container
     * element via a typestyle class
     */
    container?: NestedCSSProperties;

    /**
     * CSS properties that will be applied to the inner svg
     * element via a typestyle class
     */
    element?: NestedCSSProperties;

    /**
     * Options that function as modifiers for this style's
     * CSS properties
     */
    options?: ISheetOptions;

    /**
     * FUTURE: CSS properties that will be applied to the label
     * element, if any, via a typestyle class
     */
    // labelCSS?: NestedCSSProperties;
  }

  /**
   * A stylesheet containing only collections of CSS style props that
   * can be fed directly to typestyle's style() function. A standard
   * ISheet can be resolved to a "pure" stylesheet by processing and
   * removing any options
   */
  interface ISheetPure extends ISheet {
    /**
     * Options are disallowed
     */
    options?: undefined;
  }

  /**
   * Type to help with resolving a stylesheet that might be a string
   */
  type ISheetResolvable = ISheet | IBuiltin;

  export interface IProps extends NestedCSSProperties, ISheetOptions {
    /**
     * Specify the icon styling. Can be either a string naming one of
     * the builtin icon stylesheets, a LabIconStyle.ISheet object, or an
     * array containing any mixture of the two. If an array is provided,
     * the actual style will be determined by merging the stylesheets in
     * the array, giving precedence to the rightmost values.
     */
    stylesheet?: ISheetResolvable | ISheetResolvable[];
  }

  /**
   * The builtin stylesheets
   */
  const builtinSheets: { [k in IBuiltin]: ISheet } = {
    breadCrumb: {
      container: {
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
      element: {
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
      container: {
        height: '14px',
        margin: '0 14px 0 auto'
      },
      element: {
        height: '14px',
        width: '14px'
      },
      options: {
        elementPosition: 'center'
      }
    },

    commandPaletteItem: {
      element: {
        height: '16px',
        width: '16px'
      },
      options: {
        elementPosition: 'center'
      }
    },

    launcherCard: {
      container: {
        height: '52px',
        width: '52px'
      },
      element: {
        height: '52px',
        width: '52px'
      },
      options: {
        elementPosition: 'center'
      }
    },

    launcherSection: {
      container: {
        boxSizing: 'border-box',
        marginRight: '12px',
        height: '32px',
        width: '32px'
      },
      element: {
        height: '32px',
        width: '32px'
      },
      options: {
        elementPosition: 'center'
      }
    },

    listing: {
      container: {
        flex: '0 0 20px',
        marginRight: '4px',
        position: 'relative'
      },
      element: {
        height: '16px',
        width: '16px'
      },
      options: {
        elementPosition: 'center'
      }
    },

    listingHeaderItem: {
      container: {
        display: 'inline',
        height: '16px',
        width: '16px'
      },
      element: {
        height: 'auto',
        margin: '-2px 0 0 0',
        width: '20px'
      },
      options: {
        elementPosition: 'center'
      }
    },

    mainAreaTab: {
      container: {
        $nest: {
          '.lm-DockPanel-tabBar &': {
            marginRight: '4px'
          }
        }
      },
      element: {
        $nest: {
          '.lm-DockPanel-tabBar &': {
            height: '14px',
            width: '14px'
          }
        }
      },
      options: {
        elementPosition: 'center'
      }
    },

    menuItem: {
      container: {
        display: 'inline-block',
        verticalAlign: 'middle'
      },
      element: {
        height: '16px',
        width: '16px'
      },
      options: {
        elementPosition: 'center'
      }
    },

    runningItem: {
      container: {
        margin: '0px 4px 0px 4px'
      },
      element: {
        height: '16px',
        width: '16px'
      },
      options: {
        elementPosition: 'center'
      }
    },

    select: {
      container: {
        pointerEvents: 'none'
      },
      element: {
        position: 'absolute',
        height: 'auto',
        width: '16px'
      }
    },

    settingsEditor: {
      container: {
        display: 'flex',
        flex: '0 0 20px',
        margin: '0 3px 0 0',
        position: 'relative',
        height: '20px',
        width: '20px'
      },
      element: {
        height: '16px',
        width: '16px'
      },
      options: {
        elementPosition: 'center'
      }
    },

    sideBar: {
      element: {
        height: 'auto',
        width: '20px'
      },
      options: {
        elementPosition: 'center'
      }
    },

    splash: {
      container: {
        animation: '0.3s fade-in linear forwards',
        height: '100%',
        width: '100%',
        zIndex: 1
      },
      element: {
        // width no height
        width: '100px'
      },
      options: {
        elementPosition: 'center'
      }
    },

    statusBar: {
      element: {
        left: '0px',
        top: '0px',
        height: '18px',
        width: '20px',
        position: 'relative'
      }
    },

    toolbarButton: {
      container: {
        display: 'inline-block',
        verticalAlign: 'middle'
      },
      element: {
        height: '16px',
        width: '16px'
      },
      options: {
        elementPosition: 'center'
      }
    }
  };

  function _elementPositionFactory(extra: NestedCSSProperties): ISheet {
    return {
      container: {
        alignItems: 'center',
        display: 'flex'
      },
      element: {
        display: 'block',
        ...extra
      }
    };
  }

  /**
   * Styles to help with positioning
   */
  const positionSheets: { [k in IPosition]: ISheet } = {
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

  function _elementSizeFactory(size: string): ISheet {
    return {
      element: {
        height: size,
        width: size
      }
    };
  }

  /**
   * sheets that establish some default sizes
   */
  const sizeSheets: { [k in ISize]: ISheet } = {
    small: _elementSizeFactory('14px'),
    normal: _elementSizeFactory('16px'),
    large: _elementSizeFactory('20px'),
    xlarge: _elementSizeFactory('24px')
  };

  /**
   * Merge two or more icon sheets into a single "pure"
   * icon style (ie collections of CSS props only)
   */
  function mergeSheets(sheets: ISheet[]): ISheetPure {
    return {
      container: Object.assign({}, ...sheets.map(s => s.container)),
      element: Object.assign({}, ...sheets.map(s => s.element))
    };
  }

  /**
   * Resolve one or more stylesheets that may just be a string naming
   * one of the builtin stylesheets to an array of proper ISheet objects
   */
  function resolveSheet(
    stylesheet: ISheetResolvable | ISheetResolvable[] | undefined
  ): ISheet[] {
    if (!stylesheet) {
      return [];
    }

    if (!Array.isArray(stylesheet)) {
      // wrap in array
      stylesheet = [stylesheet];
    }

    return stylesheet.map(k => (typeof k === 'string' ? builtinSheets[k] : k));
  }

  /**
   * Resolve and merge multiple icon stylesheets
   */
  function applySheetOptions(sheets: ISheet[]) {
    const options: ISheetOptions = Object.assign(
      {},
      ...sheets.map(s => s.options)
    );

    if (options.elementPosition) {
      sheets.unshift(positionSheets[options.elementPosition]);
    }

    if (options.elementSize) {
      sheets.unshift(sizeSheets[options.elementSize]);
    }

    return mergeSheets(sheets);
  }

  /**
   * Resolve a pure icon stylesheet into a typestyle class
   */
  function resolveStyleClass(stylesheet: ISheetPure): string {
    return typestyleClass({
      ...stylesheet.container,
      $nest: {
        ...stylesheet.container?.$nest,
        ['svg']: stylesheet.element
      }
    });
  }

  // cache style classes for builtin stylesheets
  const _styleClassCache = new Map<string, string>();

  /**
   * Get a typestyle class, given a set of icon styling props
   */
  export function styleClass(props?: IProps): string {
    if (!props || Object.keys(props).length === 0) {
      // props is empty
      return '';
    }

    let { elementPosition, elementSize, stylesheet, ...elementCSS } = props;

    // add option args with defined values to overrides
    const options = {
      ...(elementPosition && { elementPosition }),
      ...(elementSize && { elementSize })
    };

    // try to look up the style class in the cache
    const cacheable =
      typeof stylesheet === 'string' && Object.keys(elementCSS).length === 0;
    const cacheKey = cacheable
      ? [stylesheet, elementPosition, elementSize].join(',')
      : '';
    if (cacheable && _styleClassCache.has(cacheKey)) {
      return _styleClassCache.get(cacheKey)!;
    }

    // resolve kind to an array of sheets, then stick overrides on the end
    const sheets = resolveSheet(stylesheet);
    sheets.push({ element: elementCSS, options });

    // apply style options/merge sheets, then convert to typestyle class
    const cls = resolveStyleClass(applySheetOptions(sheets));

    if (cacheable) {
      // store in cache for later reuse
      _styleClassCache.set(cacheKey, cls);
    }

    return cls;
  }
}
