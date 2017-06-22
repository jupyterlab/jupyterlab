// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ArrayExt, ArrayIterator, IIterator, map, toArray, each
} from '@phosphor/algorithm';

import {
  Token, JSONObject
} from '@phosphor/coreutils';

import {
  DisposableDelegate, IDisposable
} from '@phosphor/disposable';

import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import * as vdom from '@phosphor/virtualdom';

import {
  VDomModel, VDomRenderer
} from '@jupyterlab/apputils';

import '../style/index.css';

/**
 * The command IDs used by the launcher plugin.
 */
export
namespace CommandIDs {
  export
  const show: string = 'launcher:show';
};



/* tslint:disable */
/**
 * The launcher token.
 */
export
const ILauncher = new Token<ILauncher>('jupyter.services.launcher');
/* tslint:enable */

const h = vdom.h;

// export
// type PropsType = JSONObject | null;

// export
// type FunctionalComponent = (props: PropsType, ...children: vdom.h.Child[]) => vdom.VirtualElement;

// export function h(tag: string | FunctionalComponent, ...children: vdom.h.Child[]): vdom.VirtualElement;
// export function h(tag: string | FunctionalComponent, attrs: vdom.ElementAttrs | PropsType, ...children: vdom.h.Child[]): vdom.VirtualElement;
// export function h(tag: string | FunctionalComponent): vdom.VirtualElement {
//   let attrs: vdom.ElementAttrs = {};
//   let children: vdom.VirtualNode[] = [];
//   for (let i = 1, n = arguments.length; i < n; ++i) {
//     let arg = arguments[i];
//     if (typeof arg === 'string') {
//       children.push(new vdom.VirtualText(arg));
//     } else if (arg instanceof vdom.VirtualText) {
//       children.push(arg);
//     } else if (arg instanceof vdom.VirtualElement) {
//       children.push(arg);
//     } else if (arg instanceof Array) {
//       extend(children, arg);
//     } else if (i === 1 && arg && typeof arg === 'object') {
//       attrs = arg;
//     }
//   }

//   let result: any;

//   if (typeof tag === 'function') {
//     result = tag(attrs, ...children);
//   } else {
//     result = new vdom.VirtualElement(tag, attrs, children);
//   }
//   return result;

//   function extend(array: vdom.VirtualNode[], values: vdom.h.Child[]): void {
//     for (let child of values) {
//       if (typeof child === 'string') {
//         array.push(new vdom.VirtualText(child));
//       } else if (child instanceof vdom.VirtualText) {
//         array.push(child);
//       } else if (child instanceof vdom.VirtualElement) {
//         array.push(child);
//       }
//     }
//   }
// }

/**
 * The class name added to LauncherWidget instances.
 */
const LAUNCHER_CLASS = 'jp-LauncherWidget';

/**
 * The class name added to LauncherWidget image nodes.
 */
const IMAGE_CLASS = 'jp-LauncherWidget-image';

/**
 * The class name added to LauncherWidget text nodes.
 */
const TEXT_CLASS = 'jp-LauncherWidget-text';

/**
 * The class name added to LauncherWidget item nodes.
 */
const ITEM_CLASS = 'jp-LauncherWidget-item';

/**
 * The class name added to LauncherWidget body nodes.
 */
const BODY_CLASS = 'jp-LauncherWidget-body';


/**
 * The launcher interface.
 */
export
interface ILauncher {
  /**
   * Add a command item to the launcher, and trigger re-render event for parent
   * widget.
   *
   * @param options - The specification options for a launcher item.
   *
   * @returns A disposable that will remove the item from Launcher, and trigger
   * re-render event for parent widget.
   *
   */
  add(options: ILauncherItem): IDisposable;
}


/**
 * The specification for a launcher item.
 */
export
interface ILauncherItem {
  /**
   * The display name for the launcher item.
   */
  displayName: string;

  /**
   * The callback invoked to launch the item.
   *
   * The callback is invoked with a current working directory and the
   * name of the selected launcher item.  When the function returns
   * the launcher will close.
   */
  callback: (cwd: string, name: string) => Widget | Promise<Widget>;

  /**
   * The icon class for the launcher item.
   *
   * #### Notes
   * This class name will be added to the icon node for the visual
   * representation of the launcher item.
   *
   * Multiple class names can be separated with white space.
   *
   * The default value is an empty string.
   */
  iconClass?: string;

  /**
   * The icon label for the launcher item.
   *
   * #### Notes
   * This label will be added as text to the icon node for the visual
   * representation of the launcher item.
   *
   * The default value is an empty string.
   */
  iconLabel?: string;

  /**
   * The identifier for the launcher item.
   *
   * The default value is the displayName.
   */
  name?: string;

  /**
   * The category for the launcher item.
   *
   * The default value is the an empty string.
   */
  category?: string;

  /**
   * The rank for the launcher item.
   *
   * The rank is used when ordering launcher items
   * for display. Items are sorted in the following order:
   *   1. Rank (lower is better)
   *   2. Category (locale order)
   *   3. Display Name (locale order)
   *
   * The default rank is `Infinity`.
   */
  rank?: number;

  kernelIconUrl?: string;
}


/**
 * LauncherModel keeps track of the path to working directory and has a list of
 * LauncherItems, which the LauncherWidget will render.
 */
export
class LauncherModel extends VDomModel implements ILauncher {
  /**
   * Create a new launcher model.
   */
  constructor() {
    super();
  }

  /**
   * Add a command item to the launcher, and trigger re-render event for parent
   * widget.
   *
   * @param options - The specification options for a launcher item.
   *
   * @returns A disposable that will remove the item from Launcher, and trigger
   * re-render event for parent widget.
   *
   */
  add(options: ILauncherItem): IDisposable {
    // Create a copy of the options to circumvent mutations to the original.
    let item = Private.createItem(options);

    this._items.push(item);
    this.stateChanged.emit(void 0);

    return new DisposableDelegate(() => {
      ArrayExt.removeFirstOf(this._items, item);
      this.stateChanged.emit(void 0);
    });
  }

  /**
   * Return an iterator of launcher items.
   */
  items(): IIterator<ILauncherItem> {
    return new ArrayIterator(this._items);
  }

  private _items: ILauncherItem[] = [];
}


/**
 * A virtual-DOM-based widget for the Launcher.
 */
export
class LauncherWidget extends VDomRenderer<LauncherModel> {
  /**
   * Construct a new launcher widget.
   */
  constructor(options: LauncherWidget.IOptions) {
    super();
    this.cwd = options.cwd;
    this._callback = options.callback;
    this.addClass(LAUNCHER_CLASS);
  }

  /**
   * The cwd of the launcher.
   */
  readonly cwd: string;

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.tabIndex = -1;
    this.node.focus();
  }

  /**
   * Render the launcher to virtual DOM nodes.
   */
  protected render(): vdom.VirtualNode | vdom.VirtualNode[] {
    // First group-by categories
    let categories = Object.create(null);
    each(this.model.items(), (item, index) => {
      let cat = item.category;
      if (categories[cat]) {
        (categories[cat] as Array<ILauncherItem>).push(item)
      } else {
        categories[cat] = [];
      }
    });
    // Within each category sort by rank
    for (let cat in categories) {
      categories[cat] = categories[cat].sort(Private.sortCmp);
    }

    // Variable to help create sections
    let sections: vdom.VirtualNode[] = [];
    let section: vdom.VirtualNode;

    // Render the notebook category
    if (categories.Notebook) {
      section = (
        <section>
          <h2>Notebook</h2>
          {map(categories.Notebook, item => Card((item as ILauncherItem), this, this._callback))}
        </section>
      );
      sections.push(section);
    }



    let items = map(sorted, item => {
      let onclick = () => {
        let callback = item.callback;
        let value = callback(this.cwd, item.name);
        Promise.resolve(value).then(widget => {
          let callback = this._callback;
          callback(widget);
          this.dispose();
        });
      };
      let imageClass = `${item.iconClass} ${IMAGE_CLASS}`;
      let icon;
      if (item.kernelIconUrl) {
        icon = <img src={item.kernelIconUrl} onclick={onclick} />
        // icon = h.img({ src: item.kernelIconUrl, onclick }, item.iconLabel);
      } else {
        icon = <div className={imageClass} onclick={onclick}>{item.iconLabel}</div>
        // icon = h.div({ className: imageClass, onclick }, item.iconLabel);
      }
      let title = item.displayName + (item.category ? ' ' + item.category : '');
      let text = <span className={TEXT_CLASS} onclick={onclick} title={title}>{title}</span>
      // let text = h.span({className: TEXT_CLASS, onclick, title }, title);
      // return <div className="">{[icon, text].map((item)=>{item}}</div>;
      return vdom.h.div({
        className: ITEM_CLASS,
      }, [icon, text]);
    });

    let children: vdom.VirtualNode[];
    children = toArray(items);
    return vdom.h.div({ className: BODY_CLASS  }, children);
  }

  private _callback: (widget: Widget) => void;
}


/**
 * The namespace for `LauncherWidget` class statics.
 */
export
namespace LauncherWidget {
  /**
   * The options used to create a LauncherWidget.
   */
  export
  interface IOptions {
    /**
     * The cwd of the launcher.
     */
    cwd: string;

    /**
     * The callback used when an item is launched.
     */
    callback: (widget: Widget) => void;

  }
}


/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * Create an item given item options.
   */
  export
  function createItem(options: ILauncherItem): ILauncherItem {
    return {
      ...options,
      category: options.category || '',
      name: options.name || options.name,
      iconClass: options.iconClass || '',
      iconLabel: options.iconLabel || '',
      rank: options.rank !== undefined ? options.rank : Infinity
    };
  }

  /**
   * A sort comparison function for a launcher item.
   */
  export
  function sortCmp(a: ILauncherItem, b: ILauncherItem): number {
    // First, compare by rank.
    let r1 = a.rank;
    let r2 = b.rank;
    if (r1 !== r2) {
      return r1 < r2 ? -1 : 1;  // Infinity safe
    }

    // Finally, compare by display name.
    return a.displayName.localeCompare(b.displayName);
  }
}

export
function Card(item: ILauncherItem, launcher: LauncherWidget, launcherCallback: (widget: Widget) => void): vdom.VirtualElement {
  let onclick = () => {
    let callback = item.callback as any;
    let value = callback(launcher.cwd, item.name);
    Promise.resolve(value).then(widget => {
      launcherCallback(widget);
      launcher.dispose();
    });
  };
  return (
    <div className="jp-LauncherCard" onclick={onclick}>
      <div className="jp-LauncherCard-image">
          {item.kernelIconUrl && <img src="" />}
          {!item.kernelIconUrl && <div className="jp-SVGIcon" />}
      </div>
      <div className="jp-LauncherCard-label">{item.displayName}</div>
    </div>
  );
}

// export
// function Section(props: PropsType, ...children: vdom.h.Child[]): vdom.VirtualElement {
//   return (
//     <div className="jp-Section">
//       <div className="jp-Section-header">
//       </div>
//       <div className="jp-Section-activities">
//       </div>
//     </div>
//   );
// }
// }

