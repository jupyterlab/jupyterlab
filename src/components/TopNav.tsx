import * as React from 'react';

import { classes } from 'typestyle';

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
  AdvancedOptionsRightStyle,
  AdvancedOptionsLinkStyle,
  AdvancedOptionsRightLinkStyle,
  HeaderRowStyle,
  HeaderRowContainerStyle,
  AdvancedOptionsContainerStyle
} from '../componentStyle/TopNavStyle';

import { CellStyle } from '../componentStyle/ShortcutItemStyle';

import { ShortcutTitleItem } from './ShortcutTitleItem';

export interface IAdvancedOptionsProps {
  size: string;
  openAdvanced: Function;
  toggleSelectors: Function;
  showSelectors: boolean;
  resetShortcuts: Function;
}

export interface ISymbolsProps {
  size: string
}

class Symbols extends React.Component<ISymbolsProps, {}> {
  render() {
    if (this.props.size === 'regular') {
      return (
        <div className={SymbolsStyle}>
          <div className={SymbolsRowStyle}>
            <div>Command   ⌘</div>
            <div>Alt  ⌥</div>
          </div>
          <div className={SymbolsRowStyle}>
            <div>Shift  ⇧</div>
            <div>Control   ⌃</div>
          </div>
        </div>
      )
    } else {
      return (
        <div className={classes(SymbolsStyle, SymbolsSmallStyle)}>
          <div className={SymbolsRowStyle}>
            <div>{this.props.size === 'tiny'
              ? 'Cmd  ⌘'
              : 'Command  ⌘'
            }</div>
          </div>
          <div className={SymbolsRowStyle}>
            <div>Alt  ⌥</div>
          </div>
          <div className={SymbolsRowStyle}>
            <div>Shift  ⇧</div>
          </div>
          <div className={SymbolsRowStyle}>
            <div>{this.props.size === 'tiny'
              ? 'Ctrl  ⌃'
              : 'Control  ⌃'
            }</div>
          </div>
        </div>
      )
    }
  }
}

class AdvancedOptions extends React.Component<IAdvancedOptionsProps, {}> {
  render() {
    if (this.props.size === 'regular') {
      return (
        <div className={AdvancedOptionsContainerStyle}>
          <div className={AdvancedOptionsStyle}>
            <a className={AdvancedOptionsLinkStyle}
              onClick={() => this.props.openAdvanced()
              }>
              Advanced Editor
            </a>
            <a className={AdvancedOptionsLinkStyle}
              onClick={() => this.props.toggleSelectors()}
            >
              {this.props.showSelectors ? 'Hide Selectors' : 'Show Selectors'}
            </a>
          </div>
          <div
            className={classes(AdvancedOptionsStyle, AdvancedOptionsRightStyle)}
          >
            <a className={classes(AdvancedOptionsLinkStyle, AdvancedOptionsRightLinkStyle)}
              onClick={() => this.props.resetShortcuts()}
            >
              Reset All
            </a>
          </div>
        </div>
      )
    } else {
      return (
        <div className={classes(AdvancedOptionsStyle, AdvancedOptionsSmallStyle)}>
          <a className={AdvancedOptionsLinkStyle}
            onClick={() => this.props.openAdvanced()}
          >
            Advanced Editor
          </a>
          <a className={AdvancedOptionsLinkStyle}
            onClick={() => this.props.toggleSelectors()}
          >
            {this.props.showSelectors ? 'Hide Selectors' : 'Show Selectors'}
          </a>
          <a className={classes(AdvancedOptionsLinkStyle)}
            onClick={() => this.props.resetShortcuts()
            }>
            Reset All
          </a>
        </div>
      )
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
}

/** React component for top navigation */
export class TopNav extends React.Component<ITopNavProps, {}> {
  constructor(props: any) {
    super(props)
  }

  getSize = (width: number): string => {
    let size: string = 'regular'
    if (width < 620) {
      size = 'tiny'
    } else if (width < 980) {
      size = 'small'
    }
    return size
  }

  render() {
    return (
      <div className={TopStyle}>
        <div className={TopNavStyle}>
          <Symbols
            size={this.getSize(this.props.width)}
          />
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
