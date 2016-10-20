// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  enumerate, IIterator, map, toArray
} from 'phosphor/lib/algorithm/iteration';

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  Vector
} from 'phosphor/lib/collections/vector';

import {
  DisposableDelegate, IDisposable
} from 'phosphor/lib/core/disposable';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  Token
} from 'phosphor/lib/core/token';

import {
  CommandRegistry
} from 'phosphor/lib/ui/commandregistry';

import {
  h, VNode
} from 'phosphor/lib/ui/vdom';

import {
  VDomModel, VDomWidget
} from '../common/vdom';


/* tslint:disable */
/**
 * The launcher token.
 */
export
const ILauncher = new Token<ILauncher>('jupyter.services.launcher');
/* tslint:enable */


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
 * The class name added to LauncherWidget folder node.
 */
const FOLDER_CLASS = 'jp-LauncherWidget-folder';

/**
 * The class name added to LauncherWidget path nodes.
 */
const PATH_CLASS = 'jp-LauncherWidget-path';

/**
 * The class name added to LauncherWidget current working directory node.
 */
const CWD_CLASS = 'jp-LauncherWidget-cwd';

/**
 * The class name added to LauncherWidget body nodes.
 */
const BODY_CLASS = 'jp-LauncherWidget-body';

/**
 * The class name added to LauncherWidget dialog node.
 */
const DIALOG_CLASS = 'jp-LauncherWidget-dialog';


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
   * The display name of the launcher item.
   */
  name: string;

  /**
   * The ID of the command that is called to launch the item.
   */
  command: string;

  /**
   * The command arguments, if any, needed to launch the item.
   */
  args?: JSONObject;

  /**
   * The image class name to attach to the launcher item. Defaults to
   * 'jp-Image' followed by the `name` with spaces removed. So if the name is
   * 'Launch New Terminal' the class name will be 'jp-ImageLaunchNewTerminal'.
   */
  imgClassName?: string;
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
  constructor(options: LauncherModel.IOptions) {
    super();
    this._commands = options.commands;
    this._items = new Vector<ILauncherItem>();
  }

  /**
   * The command registry.
   */
  get commands(): CommandRegistry {
    return this._commands;
  }

  /**
   * The path to the current working directory.
   */
  get path(): string {
    return this._path;
  }
  set path(path: string) {
    if (path === this._path) {
      return;
    }
    this._path = path;
    this.stateChanged.emit(void 0);
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
    let item = JSON.parse(JSON.stringify(options));

    // If image class name is not set, use the default value.
    item.imgClassName = item.imgClassName ||
      `jp-Image${item.name.replace(/\ /g, '')}`;

    this._items.pushBack(item);
    this.stateChanged.emit(void 0);

    return new DisposableDelegate(() => {
      this._items.remove(item);
      this.stateChanged.emit(void 0);
    });
  }

  /**
   * Execute the command of the launcher item at a specific index.
   *
   * @param index - The index of the launcher item to execute.
   */
  execute(index: number): void {
    let item = this._items.at(index);
    if (!item) {
      return;
    }
    this.commands.execute(item.command, item.args);
  }

  /**
   * Return an iterator of launcher items.
   */
  items(): IIterator<ILauncherItem> {
    return this._items.iter();
  }

  private _commands: CommandRegistry = null;
  private _items: Vector<ILauncherItem> = null;
  private _path: string = 'home';
}


/**
 * A namespace for launcher model statics.
 */
export
namespace LauncherModel {
  /**
   * The instantiation options for a launcher model.
   */
  export
  interface IOptions {
    /**
     * The command registry instance that all launcher commands should use.
     */
    commands: CommandRegistry;
  }
}


/**
 * A virtual-DOM-based widget for the Launcher.
 */
export
class LauncherWidget extends VDomWidget<LauncherModel> {
  /**
   * Construct a new launcher widget.
   */
  constructor() {
    super();
    this.addClass(LAUNCHER_CLASS);
  }

  /**
   * Handle the DOM events for launcher widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the panel's DOM node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
    case 'click':
      this._evtClick(event as MouseEvent);
      break;
    default:
      return;
    }
  }

  /**
   * Handle `after_attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('click', this);
  }

  /**
   * Handle `before_detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    this.node.removeEventListener('click', this);
  }

  /**
   * Render the launcher to virtual DOM nodes.
   */
  protected render(): VNode | VNode[] {
    // Create an iterator that yields rendered item nodes.
    let children = map(enumerate(this.model.items()), ([index, item]) => {
      let img = h.span({className: item.imgClassName + ' ' + IMAGE_CLASS});
      let text = h.span({className: TEXT_CLASS }, item.name);
      return h.div({ className: ITEM_CLASS, dataset: { index } }, [img, text]);
    });

    let folderImage = h.span({ className: FOLDER_CLASS });
    let p = this.model.path;
    let pathName = p.length ? `home > ${p.replace(/\//g, ' > ')}` : 'home';
    let path = h.span({ className: PATH_CLASS }, pathName );
    let cwd = h.div({ className: CWD_CLASS }, [folderImage, path]);
    let body = h.div({ className: BODY_CLASS  }, toArray(children));

    return h.div({ className: DIALOG_CLASS }, [cwd, body]);
  }

  /**
   * Handle click events on the widget.
   */
  private _evtClick(event: MouseEvent) {
    let target = event.target as HTMLElement;
    while (target !== this.node) {
      if (target.classList.contains(ITEM_CLASS)) {
        let index = parseInt(target.getAttribute('data-index'), 10);
        this.model.execute(index);
        return;
      }
      target = target.parentElement;
    }
  }
}
