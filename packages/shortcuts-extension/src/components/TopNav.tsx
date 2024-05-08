/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ITranslator } from '@jupyterlab/translation';
import { FilterBox } from '@jupyterlab/ui-components';
import * as React from 'react';

import { ShortcutTitleItem } from './ShortcutTitleItem';
import { IShortcutUI } from '../types';

export interface IAdvancedOptionsProps {
  toggleSelectors: IShortcutUI['toggleSelectors'];
  showSelectors: boolean;
  resetShortcuts: IShortcutUI['resetShortcuts'];
  translator: ITranslator;
}

export interface ISymbolsProps {}

function Symbols(props: ISymbolsProps): JSX.Element {
  return (
    <div className="jp-Shortcuts-Symbols">
      <table>
        <tbody>
          <tr>
            <td>
              <kbd>Cmd</kbd>
            </td>
            <td>⌘</td>
            <td>
              <kbd>Ctrl</kbd>
            </td>
            <td>⌃</td>
          </tr>
          <tr>
            <td>
              <kbd>Alt</kbd>
            </td>
            <td>⌥</td>
            <td>
              <kbd>Shift</kbd>
            </td>
            <td>⇧</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function AdvancedOptions(props: IAdvancedOptionsProps): JSX.Element {
  const trans = props.translator.load('jupyterlab');
  return (
    <div className="jp-Shortcuts-AdvancedOptions">
      <a
        className="jp-Shortcuts-AdvancedOptionsLink"
        onClick={() => props.toggleSelectors()}
      >
        {props.showSelectors
          ? trans.__('Hide Selectors')
          : trans.__('Show Selectors')}
      </a>
      <a
        className="jp-Shortcuts-AdvancedOptionsLink"
        onClick={() => props.resetShortcuts()}
      >
        {trans.__('Reset All')}
      </a>
    </div>
  );
}

/** State for TopNav component */
export interface ITopNavProps {
  resetShortcuts: IShortcutUI['resetShortcuts'];
  updateSearchQuery: IShortcutUI['updateSearchQuery'];
  toggleSelectors: IShortcutUI['toggleSelectors'];
  showSelectors: boolean;
  updateSort: IShortcutUI['updateSort'];
  currentSort: string;
  width: number;
  translator: ITranslator;
}

/** React component for top navigation */
export class TopNav extends React.Component<ITopNavProps> {
  constructor(props: ITopNavProps) {
    super(props);
  }

  getShortCutTitleItem(title: string, columnId: IShortcutUI.ColumnId) {
    return (
      <div className="jp-Shortcuts-Cell">
        <ShortcutTitleItem
          title={title}
          updateSort={this.props.updateSort}
          active={this.props.currentSort}
          columnId={columnId}
        />
      </div>
    );
  }

  render() {
    const trans = this.props.translator.load('jupyterlab');
    return (
      <div className="jp-Shortcuts-Top">
        <div className="jp-Shortcuts-TopNav">
          <Symbols />
          <FilterBox
            aria-label={trans.__('Search shortcuts')}
            updateFilter={(_, query) =>
              this.props.updateSearchQuery(query ?? '')
            }
            placeholder={trans.__('Search…')}
            useFuzzyFilter={false}
          />
          <AdvancedOptions
            toggleSelectors={this.props.toggleSelectors}
            showSelectors={this.props.showSelectors}
            resetShortcuts={this.props.resetShortcuts}
            translator={this.props.translator}
          />
        </div>
        <div className="jp-Shortcuts-HeaderRowContainer">
          <div className="jp-Shortcuts-HeaderRow">
            {this.getShortCutTitleItem(trans.__('Category'), 'category')}
            {this.getShortCutTitleItem(trans.__('Command'), 'command')}
            <div className="jp-Shortcuts-Cell">
              <div className="title-div">{trans.__('Shortcut')}</div>
            </div>
            {this.getShortCutTitleItem(trans.__('Source'), 'source')}
            {this.props.showSelectors &&
              this.getShortCutTitleItem(trans.__('Selectors'), 'selector')}
          </div>
        </div>
      </div>
    );
  }
}
