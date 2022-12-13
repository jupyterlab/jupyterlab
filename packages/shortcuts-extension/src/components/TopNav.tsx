/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator } from '@jupyterlab/translation';
import { CommandRegistry } from '@lumino/commands';
import { IDisposable } from '@lumino/disposable';
import { Menu } from '@lumino/widgets';
import * as React from 'react';

import { ShortcutTitleItem } from './ShortcutTitleItem';
import { UISize } from './ShortcutUI';

export interface IAdvancedOptionsProps {
  size: UISize;
  toggleSelectors: Function;
  showSelectors: boolean;
  resetShortcuts: Function;
  menu: Menu;
  translator: ITranslator;
}

export interface ISymbolsProps {
  size: UISize;
}

/** All external actions, setting commands, getting command list ... */
export interface IShortcutUIexternal {
  translator: ITranslator;
  getAllShortCutSettings: () => Promise<ISettingRegistry.ISettings>;
  removeShortCut: (key: string) => Promise<void>;
  createMenu: () => Menu;
  hasCommand: (id: string) => boolean;
  addCommand: (
    id: string,
    options: CommandRegistry.ICommandOptions
  ) => IDisposable;
  getLabel: (id: string) => string;
}

export namespace CommandIDs {
  export const showSelectors = 'shortcutui:showSelectors';
  export const resetAll = 'shortcutui:resetAll';
}

class Symbols extends React.Component<ISymbolsProps> {
  getRegularSymbols() {
    return (
      <div className="jp-Shortcuts-Symbols">
        <div className="jp-Shortcuts-SymbolsRow">
          <div>Cmd ⌘</div>
          <div>Alt ⌥</div>
          <div>Ctrl ⌃</div>
          <div>Shift ⇧</div>
        </div>
      </div>
    );
  }

  getSmallSymbols() {
    return (
      <div className="jp-Shortcuts-Symbols jp-Shortcuts-SymbolsSmall">
        <div className="jp-Shortcuts-SymbolsRow">
          <span>Cmd </span>
          <span className="jp-Shortcuts-commandIcon">⌘</span>
          <span>Alt </span>
          <span className="jp-Shortcuts-altIcon">⌥</span>
        </div>
        <div className="jp-Shortcuts-SymbolsRow">
          <span>Ctrl </span>
          <span className="jp-Shortcuts-controlIcon">⌃</span>
          <span>Shift </span>
          <span>⇧</span>
        </div>
      </div>
    );
  }

  getTinySymbols() {
    return (
      <div className="jp-Shortcuts-Symbols jp-Shortcuts-SymbolsSmall">
        <div className="jp-Shortcuts-SymbolsRow">
          <span>Cmd</span>
          <span>⌘</span>
        </div>
        <div className="jp-Shortcuts-SymbolsRow">
          <span>Alt</span>
          <span>⌥</span>
        </div>
        <div className="jp-Shortcuts-SymbolsRow">
          <span>Ctrl</span>
          <span>⌃</span>
        </div>
        <div className="jp-Shortcuts-SymbolsRow">
          <span>Shift</span>
          <span>⇧</span>
        </div>
      </div>
    );
  }

  render() {
    switch (this.props.size) {
      case UISize.Regular:
        return this.getRegularSymbols();
      case UISize.Small:
        return this.getSmallSymbols();
      case UISize.Tiny:
        return this.getTinySymbols();
    }
  }
}

class AdvancedOptions extends React.Component<IAdvancedOptionsProps> {
  render() {
    const trans = this.props.translator.load('jupyterlab');
    if (this.props.size === UISize.Regular) {
      return (
        <div className="jp-Shortcuts-AdvancedOptionsContainer">
          <div className="jp-Shortcuts-AdvancedOptions">
            <a
              className="jp-Shortcuts-AdvancedOptionsLink-Regular"
              onClick={() => this.props.toggleSelectors()}
            >
              {this.props.showSelectors
                ? trans.__('Hide Selectors')
                : trans.__('Show Selectors')}
            </a>
            <a
              className="jp-Shortcuts-AdvancedOptionsLink-Regular"
              onClick={() => this.props.resetShortcuts()}
            >
              {trans.__('Reset All')}
            </a>
          </div>
        </div>
      );
    } else {
      return (
        <div className="jp-Shortcuts-AdvancedOptions jp-Shortcuts-AdvancedOptionsSmall">
          <a
            className="jp-Shortcuts-AdvancedOptionsLink-Small"
            onClick={() => this.props.toggleSelectors()}
          >
            {this.props.showSelectors
              ? trans.__('Hide Selectors')
              : trans.__('Show Selectors')}
          </a>
          <a
            className="jp-Shortcuts-AdvancedOptionsLink-Small"
            onClick={() => this.props.resetShortcuts()}
          >
            {trans.__('Reset All')}
          </a>
        </div>
      );
    }
  }
}

/** State for TopNav component */
export interface ITopNavProps {
  resetShortcuts: Function;
  updateSearchQuery: Function;
  toggleSelectors: Function;
  showSelectors: boolean;
  updateSort: Function;
  currentSort: string;
  width: number;
  external: IShortcutUIexternal;
}

/** React component for top navigation */
export class TopNav extends React.Component<ITopNavProps> {
  menu: Menu;
  constructor(props: ITopNavProps) {
    super(props);

    this.addMenuCommands();
    this.menu = this.props.external.createMenu();
    this.menu.addItem({ command: CommandIDs.showSelectors });
    this.menu.addItem({ command: CommandIDs.resetAll });
  }

  addMenuCommands() {
    const trans = this.props.external.translator.load('jupyterlab');
    if (!this.props.external.hasCommand(CommandIDs.showSelectors)) {
      this.props.external.addCommand(CommandIDs.showSelectors, {
        label: trans.__('Toggle Selectors'),
        caption: trans.__('Toggle command selectors'),
        execute: () => {
          this.props.toggleSelectors();
        }
      });
    }

    if (!this.props.external.hasCommand(CommandIDs.resetAll)) {
      this.props.external.addCommand(CommandIDs.resetAll, {
        label: trans.__('Reset All'),
        caption: trans.__('Reset all shortcuts'),
        execute: () => {
          this.props.resetShortcuts();
        }
      });
    }
  }

  getSize = (width: number): UISize => {
    if (width < 730) {
      return UISize.Tiny;
    } else if (width < 1260) {
      return UISize.Small;
    } else {
      return UISize.Regular;
    }
  };

  getShortCutTitleItem(title: string) {
    return (
      <div className="jp-Shortcuts-Cell">
        <ShortcutTitleItem
          title={title}
          updateSort={this.props.updateSort}
          active={this.props.currentSort}
        />
      </div>
    );
  }

  render() {
    const trans = this.props.external.translator.load('jupyterlab');
    return (
      <div className="jp-Shortcuts-Top">
        <div className="jp-Shortcuts-TopNav">
          <Symbols size={this.getSize(this.props.width)} />
          <div className="jp-Shortcuts-SearchContainer">
            <input
              onChange={event => this.props.updateSearchQuery(event)}
              className="jp-Shortcuts-Search"
              placeholder={trans.__('Search')}
            />
          </div>
          <AdvancedOptions
            size={this.getSize(this.props.width)}
            toggleSelectors={this.props.toggleSelectors}
            showSelectors={this.props.showSelectors}
            resetShortcuts={this.props.resetShortcuts}
            menu={this.menu}
            translator={this.props.external.translator}
          />
        </div>
        <div className="jp-Shortcuts-HeaderRowContainer">
          <div className="jp-Shortcuts-HeaderRow">
            {this.getShortCutTitleItem(trans.__('Category'))}
            {this.getShortCutTitleItem(trans.__('Command'))}
            <div className="jp-Shortcuts-Cell">
              <div className="title-div">{trans.__('Shortcut')}</div>
            </div>
            {this.getShortCutTitleItem(trans.__('Source'))}
            {this.props.showSelectors &&
              this.getShortCutTitleItem(trans.__('Selectors'))}
          </div>
        </div>
      </div>
    );
  }
}
