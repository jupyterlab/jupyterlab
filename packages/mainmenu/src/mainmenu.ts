// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { TranslationBundle } from '@jupyterlab/translation';
import { IRankedMenu, MenuSvg, RankedMenu } from '@jupyterlab/ui-components';
import { ArrayExt } from '@lumino/algorithm';
import { CommandRegistry } from '@lumino/commands';
import { Menu, MenuBar } from '@lumino/widgets';
import { EditMenu } from './edit';
import { FileMenu } from './file';
import { HelpMenu } from './help';
import { KernelMenu } from './kernel';
import { RunMenu } from './run';
import { SettingsMenu } from './settings';
import { TabsMenu } from './tabs';
import { IMainMenu } from './tokens';
import { ViewMenu } from './view';

/**
 * The main menu class.  It is intended to be used as a singleton.
 */
export class MainMenu extends MenuBar implements IMainMenu {
  /**
   * Construct the main menu bar.
   */
  constructor(commands: CommandRegistry) {
    let options = { forceItemsPosition: { forceX: false, forceY: true } };
    super(options);
    this._commands = commands;
  }

  /**
   * The application "Edit" menu.
   */
  get editMenu(): EditMenu {
    if (!this._editMenu) {
      this._editMenu = new EditMenu({
        commands: this._commands,
        rank: 2,
        renderer: MenuSvg.defaultRenderer
      });
    }
    return this._editMenu;
  }

  /**
   * The application "File" menu.
   */
  get fileMenu(): FileMenu {
    if (!this._fileMenu) {
      this._fileMenu = new FileMenu({
        commands: this._commands,
        rank: 1,
        renderer: MenuSvg.defaultRenderer
      });
    }
    return this._fileMenu;
  }

  /**
   * The application "Help" menu.
   */
  get helpMenu(): HelpMenu {
    if (!this._helpMenu) {
      this._helpMenu = new HelpMenu({
        commands: this._commands,
        rank: 1000,
        renderer: MenuSvg.defaultRenderer
      });
    }
    return this._helpMenu;
  }

  /**
   * The application "Kernel" menu.
   */
  get kernelMenu(): KernelMenu {
    if (!this._kernelMenu) {
      this._kernelMenu = new KernelMenu({
        commands: this._commands,
        rank: 5,
        renderer: MenuSvg.defaultRenderer
      });
    }
    return this._kernelMenu;
  }

  /**
   * The application "Run" menu.
   */
  get runMenu(): RunMenu {
    if (!this._runMenu) {
      this._runMenu = new RunMenu({
        commands: this._commands,
        rank: 4,
        renderer: MenuSvg.defaultRenderer
      });
    }
    return this._runMenu;
  }

  /**
   * The application "Settings" menu.
   */
  get settingsMenu(): SettingsMenu {
    if (!this._settingsMenu) {
      this._settingsMenu = new SettingsMenu({
        commands: this._commands,
        rank: 999,
        renderer: MenuSvg.defaultRenderer
      });
    }
    return this._settingsMenu;
  }

  /**
   * The application "View" menu.
   */
  get viewMenu(): ViewMenu {
    if (!this._viewMenu) {
      this._viewMenu = new ViewMenu({
        commands: this._commands,
        rank: 3,
        renderer: MenuSvg.defaultRenderer
      });
    }
    return this._viewMenu;
  }

  /**
   * The application "Tabs" menu.
   */
  get tabsMenu(): TabsMenu {
    if (!this._tabsMenu) {
      this._tabsMenu = new TabsMenu({
        commands: this._commands,
        rank: 500,
        renderer: MenuSvg.defaultRenderer
      });
    }
    return this._tabsMenu;
  }

  /**
   * Add a new menu to the main menu bar.
   */
  addMenu(
    menu: Menu,
    update: boolean = true,
    options: IMainMenu.IAddOptions = {}
  ): void {
    if (ArrayExt.firstIndexOf(this.menus, menu) > -1) {
      return;
    }

    // override default renderer with svg-supporting renderer
    MenuSvg.overrideDefaultRenderer(menu);

    const rank =
      'rank' in options
        ? options.rank
        : 'rank' in menu
        ? (menu as any).rank
        : IRankedMenu.DEFAULT_RANK;
    const rankItem = { menu, rank };
    const index = ArrayExt.upperBound(this._items, rankItem, Private.itemCmp);

    // Upon disposal, remove the menu and its rank reference.
    menu.disposed.connect(this._onMenuDisposed, this);

    ArrayExt.insert(this._items, index, rankItem);
    /**
     * Create a new menu.
     */
    this.insertMenu(index, menu);

    // Link the menu to the API - backward compatibility when switching to menu description in settings
    switch (menu.id) {
      case 'jp-mainmenu-file':
        if (!this._fileMenu && menu instanceof FileMenu) {
          this._fileMenu = menu;
        }
        break;
      case 'jp-mainmenu-edit':
        if (!this._editMenu && menu instanceof EditMenu) {
          this._editMenu = menu;
        }
        break;
      case 'jp-mainmenu-view':
        if (!this._viewMenu && menu instanceof ViewMenu) {
          this._viewMenu = menu;
        }
        break;
      case 'jp-mainmenu-run':
        if (!this._runMenu && menu instanceof RunMenu) {
          this._runMenu = menu;
        }
        break;
      case 'jp-mainmenu-kernel':
        if (!this._kernelMenu && menu instanceof KernelMenu) {
          this._kernelMenu = menu;
        }
        break;
      case 'jp-mainmenu-tabs':
        if (!this._tabsMenu && menu instanceof TabsMenu) {
          this._tabsMenu = menu;
        }
        break;
      case 'jp-mainmenu-settings':
        if (!this._settingsMenu && menu instanceof SettingsMenu) {
          this._settingsMenu = menu;
        }
        break;
      case 'jp-mainmenu-help':
        if (!this._helpMenu && menu instanceof HelpMenu) {
          this._helpMenu = menu;
        }
        break;
    }
  }

  /**
   * Dispose of the resources held by the menu bar.
   */
  dispose(): void {
    this._editMenu?.dispose();
    this._fileMenu?.dispose();
    this._helpMenu?.dispose();
    this._kernelMenu?.dispose();
    this._runMenu?.dispose();
    this._settingsMenu?.dispose();
    this._viewMenu?.dispose();
    this._tabsMenu?.dispose();
    super.dispose();
  }

  /**
   * Generate the menu.
   *
   * @param commands The command registry
   * @param options The main menu options.
   * @param trans - The application language translator.
   */
  static generateMenu(
    commands: CommandRegistry,
    options: IMainMenu.IMenuOptions,
    trans: TranslationBundle
  ): RankedMenu {
    let menu: RankedMenu;
    const { id, label, rank } = options;
    switch (id) {
      case 'jp-mainmenu-file':
        menu = new FileMenu({
          commands,
          rank,
          renderer: MenuSvg.defaultRenderer
        });
        break;
      case 'jp-mainmenu-edit':
        menu = new EditMenu({
          commands,
          rank,
          renderer: MenuSvg.defaultRenderer
        });
        break;
      case 'jp-mainmenu-view':
        menu = new ViewMenu({
          commands,
          rank,
          renderer: MenuSvg.defaultRenderer
        });
        break;
      case 'jp-mainmenu-run':
        menu = new RunMenu({
          commands,
          rank,
          renderer: MenuSvg.defaultRenderer
        });
        break;
      case 'jp-mainmenu-kernel':
        menu = new KernelMenu({
          commands,
          rank,
          renderer: MenuSvg.defaultRenderer
        });
        break;
      case 'jp-mainmenu-tabs':
        menu = new TabsMenu({
          commands,
          rank,
          renderer: MenuSvg.defaultRenderer
        });
        break;
      case 'jp-mainmenu-settings':
        menu = new SettingsMenu({
          commands,
          rank,
          renderer: MenuSvg.defaultRenderer
        });
        break;
      case 'jp-mainmenu-help':
        menu = new HelpMenu({
          commands,
          rank,
          renderer: MenuSvg.defaultRenderer
        });
        break;
      default:
        menu = new RankedMenu({
          commands,
          rank,
          renderer: MenuSvg.defaultRenderer
        });
    }

    if (label) {
      menu.title.label = trans._p('menu', label);
    }

    return menu;
  }

  /**
   * Handle the disposal of a menu.
   */
  private _onMenuDisposed(menu: Menu): void {
    this.removeMenu(menu);
    const index = ArrayExt.findFirstIndex(
      this._items,
      item => item.menu === menu
    );
    if (index !== -1) {
      ArrayExt.removeAt(this._items, index);
    }
  }

  private _commands: CommandRegistry;
  private _items: Private.IRankItem[] = [];
  private _editMenu: EditMenu;
  private _fileMenu: FileMenu;
  private _helpMenu: HelpMenu;
  private _kernelMenu: KernelMenu;
  private _runMenu: RunMenu;
  private _settingsMenu: SettingsMenu;
  private _viewMenu: ViewMenu;
  private _tabsMenu: TabsMenu;
}

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * An object which holds a menu and its sort rank.
   */
  export interface IRankItem {
    /**
     * The menu for the item.
     */
    menu: Menu;

    /**
     * The sort rank of the menu.
     */
    rank: number;
  }

  /**
   * A comparator function for menu rank items.
   */
  export function itemCmp(first: IRankItem, second: IRankItem): number {
    return first.rank - second.rank;
  }
}
