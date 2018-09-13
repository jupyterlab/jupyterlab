import * as React from 'react';

import { classes } from 'typestyle';

import { Menu } from '@phosphor/widgets';

import { JupyterLab } from '@jupyterlab/application';

import {
  TopStyle,
  TopNavStyle,
  SymbolsStyle,
  SymbolsSmallStyle,
  SymbolsRowStyle,
  SearchContainerStyle,
  SearchStyle,
  AdvancedOptionsStyle,
  AdvancedOptionsSmallStyle,
  HeaderRowStyle,
  HeaderRowContainerStyle,
  AdvancedOptionsContainerStyle,
  AdvancedOptionsLinkStyle,
  commandIconStyle,
  altIconStyle,
  controlIconStyle
} from '../componentStyle/TopNavStyle';

import { CellStyle } from '../componentStyle/ShortcutItemStyle';

import { ShortcutTitleItem } from './ShortcutTitleItem';

export interface IAdvancedOptionsProps {
  size: string;
  openAdvanced: Function;
  toggleSelectors: Function;
  showSelectors: boolean;
  resetShortcuts: Function;
  menu: Menu;
}

export interface ISymbolsProps {
  size: string;
}

export namespace CommandIDs {
  export const showSelectors = 'shortcutui:showSelectors';
  export const advancedEditor = 'shortcutui:advancedEditor';
  export const resetAll = 'shortcutui:resetAll';
}

class Symbols extends React.Component<ISymbolsProps, {}> {
  render() {
    if (this.props.size === 'regular') {
      return (
        <div className={SymbolsStyle}>
          <div className={SymbolsRowStyle}>
            <div>Cmd ⌘</div>
            <div>Alt ⌥</div>
            <div>Ctrl ⌃</div>
            <div>Shift ⇧</div>
          </div>
        </div>
      );
    } else if (this.props.size === 'small') {
      return (
        <div className={classes(SymbolsStyle, SymbolsSmallStyle)}>
          <div className={SymbolsRowStyle}>
            <span>Cmd </span>
            <span className={commandIconStyle}>⌘</span>
            <span>Alt </span>
            <span className={altIconStyle}>⌥</span>
          </div>
          <div className={SymbolsRowStyle}>
            <span>Ctrl </span>
            <span className={controlIconStyle}>⌃</span>
            <span>Shift </span>
            <span>⇧</span>
          </div>
        </div>
      );
    } else {
      return (
        <div className={classes(SymbolsStyle, SymbolsSmallStyle)}>
          <div className={SymbolsRowStyle}>
            <span>Cmd</span>
            <span>⌘</span>
          </div>
          <div className={SymbolsRowStyle}>
            <span>Alt</span>
            <span>⌥</span>
          </div>
          <div className={SymbolsRowStyle}>
            <span>Ctrl</span>
            <span>⌃</span>
          </div>
          <div className={SymbolsRowStyle}>
            <span>Shift</span>
            <span>⇧</span>
          </div>
        </div>
      );
    }
  }
}

{
  /* <div className={classes(SymbolsStyle, SymbolsSmallStyle)}>
          <div className={SymbolsRowStyle}>
            <span>Cmd </span>
            <span>⌘</span>
            <span>Alt </span>
            <span>⌥</span>
          </div>
          <div className={SymbolsRowStyle}>
            <span>Ctrl </span>
            <span>⌃</span>
            <span>Shift </span>
            <span>⇧</span>
          </div>
        </div>
      );
    } else {
      return (
        <div className={classes(SymbolsStyle, SymbolsSmallStyle)}>
          <div className={SymbolsRowStyle}>
            <span>Cmd</span>
            <span>⌘</span>
          </div>
          <div className={SymbolsRowStyle}>
            <span>Alt</span>
            <span>⌥</span>
          </div>
          <div className={SymbolsRowStyle}>
            <span>Ctrl</span>
            <span>⌃</span>
          </div>
          <div className={SymbolsRowStyle}>
            <span>Shift</span>
            <span>⇧</span>
          </div>
        </div> */
}

class AdvancedOptions extends React.Component<IAdvancedOptionsProps, {}> {
  render() {
    if (this.props.size === 'regular') {
      return (
        <div className={AdvancedOptionsContainerStyle}>
          <div className={AdvancedOptionsStyle}>
            <a
              className={AdvancedOptionsLinkStyle(this.props.size)}
              onClick={() => this.props.openAdvanced()}
            >
              Advanced Editor
            </a>
            <a
              className={AdvancedOptionsLinkStyle(this.props.size)}
              onClick={() => this.props.toggleSelectors()}
            >
              {this.props.showSelectors ? 'Hide Selectors' : 'Show Selectors'}
            </a>
            <a
              className={classes(AdvancedOptionsLinkStyle(this.props.size))}
              onClick={() => this.props.resetShortcuts()}
            >
              Reset All
            </a>
          </div>
        </div>
      );
    } else {
      return (
        <div
          className={classes(AdvancedOptionsStyle, AdvancedOptionsSmallStyle)}
        >
          <a
            className={AdvancedOptionsLinkStyle(this.props.size)}
            onClick={() => this.props.openAdvanced()}
          >
            Advanced Editor
          </a>
          <a
            className={AdvancedOptionsLinkStyle(this.props.size)}
            onClick={() => this.props.toggleSelectors()}
          >
            {this.props.showSelectors ? 'Hide Selectors' : 'Show Selectors'}
          </a>
          <a
            className={classes(AdvancedOptionsLinkStyle(this.props.size))}
            onClick={() => this.props.resetShortcuts()}
          >
            Reset All
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
  openAdvanced: Function;
  toggleSelectors: Function;
  showSelectors: boolean;
  updateSort: Function;
  currentSort: string;
  width: number;
  app: JupyterLab;
}

/** React component for top navigation */
export class TopNav extends React.Component<ITopNavProps, {}> {
  menu: Menu;
  constructor(props: any) {
    super(props);

    this.addMenuCommands();
    const { commands } = this.props.app;
    this.menu = new Menu({ commands });
    this.menu.addItem({ command: CommandIDs.showSelectors });
    this.menu.addItem({ command: CommandIDs.advancedEditor });
    this.menu.addItem({ command: CommandIDs.resetAll });
  }

  addMenuCommands() {
    if (!this.props.app.commands.hasCommand(CommandIDs.showSelectors)) {
      this.props.app.commands.addCommand(CommandIDs.showSelectors, {
        label: 'Toggle Selectors',
        caption: 'Toggle command selectors',
        execute: () => {
          this.props.toggleSelectors();
        }
      });
    }
    if (!this.props.app.commands.hasCommand(CommandIDs.advancedEditor)) {
      this.props.app.commands.addCommand(CommandIDs.advancedEditor, {
        label: 'Advanced Editor',
        caption: 'Open advanced editor',
        execute: () => {
          this.props.openAdvanced();
        }
      });
    }
    if (!this.props.app.commands.hasCommand(CommandIDs.resetAll)) {
      this.props.app.commands.addCommand(CommandIDs.resetAll, {
        label: 'Reset All',
        caption: 'Reset all shortcuts',
        execute: () => {
          this.props.resetShortcuts();
        }
      });
    }
  }

  getSize = (width: number): string => {
    let size: string = 'regular';
    if (width < 730) {
      size = 'tiny';
    } else if (width < 1260) {
      size = 'small';
    }
    return size;
  };

  render() {
    return (
      <div className={TopStyle}>
        <div className={TopNavStyle}>
          <Symbols size={this.getSize(this.props.width)} />
          <div className={SearchContainerStyle}>
            <input
              onChange={event => this.props.updateSearchQuery(event)}
              className={SearchStyle}
              placeholder="Search"
            />
          </div>
          <AdvancedOptions
            size={this.getSize(this.props.width)}
            openAdvanced={this.props.openAdvanced}
            toggleSelectors={this.props.toggleSelectors}
            showSelectors={this.props.showSelectors}
            resetShortcuts={this.props.resetShortcuts}
            menu={this.menu}
          />
        </div>
        <div className={HeaderRowContainerStyle}>
          <div className={HeaderRowStyle}>
            <div className={CellStyle}>
              <ShortcutTitleItem
                title="Category"
                updateSort={this.props.updateSort}
                active={this.props.currentSort}
              />
            </div>
            <div className={CellStyle}>
              <ShortcutTitleItem
                title="Command"
                updateSort={this.props.updateSort}
                active={this.props.currentSort}
              />
            </div>
            <div className={CellStyle}>
              <div className="title-div">Shortcut</div>
            </div>
            <div className={CellStyle}>
              <ShortcutTitleItem
                title="Source"
                updateSort={this.props.updateSort}
                active={this.props.currentSort}
              />
            </div>
            {this.props.showSelectors && (
              <div className={CellStyle}>
                <ShortcutTitleItem
                  title="Selectors"
                  updateSort={this.props.updateSort}
                  active={this.props.currentSort}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
