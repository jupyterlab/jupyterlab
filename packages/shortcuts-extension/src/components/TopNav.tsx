/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { Button } from '@jupyter/react-components';
import type { ITranslator } from '@jupyterlab/translation';
import { checkIcon, dotsIcon, FilterBox } from '@jupyterlab/ui-components';
import * as React from 'react';

import { ShortcutTitleItem } from './ShortcutTitleItem';
import type { IShortcutUI } from '../types';

export interface IAdvancedOptionsProps {
  toggleSelectors: IShortcutUI['toggleSelectors'];
  showSelectors: boolean;
  resetShortcuts: IShortcutUI['resetShortcuts'];
  translator: ITranslator;
  toggleAllCommands: IShortcutUI['toggleAllCommands'];
  showAllCommands: boolean;
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
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setMenuOpen(false);
    }
  };

  React.useEffect(() => {
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [menuOpen]);

  return (
    <div className="jp-Shortcuts-AdvancedOptions" ref={menuRef}>
      <Button
        className="jp-Shortcuts-AdvancedOptionsButton jp-mod-styled jp-mod-reject"
        onClick={() => setMenuOpen(!menuOpen)}
        title={trans.__('Advanced options')}
        appearance={'neutral'}
      >
        <dotsIcon.react tag={null} />
      </Button>
      {menuOpen && (
        <ul className="lm-Menu lm-MenuBar-menu jp-Shortcuts-AdvancedOptionsMenu">
          <li
            className="lm-Menu-item"
            onClick={async () => {
              await props.resetShortcuts();
              setMenuOpen(false);
            }}
          >
            <div className="lm-Menu-itemIcon" />
            <div className="lm-Menu-itemLabel">{trans.__('Reset All')}</div>
          </li>
          <li
            className="lm-Menu-item"
            onClick={async () => {
              props.toggleSelectors();
              setMenuOpen(false);
            }}
          >
            {props.showSelectors ? (
              <checkIcon.react className="lm-Menu-itemIcon" />
            ) : (
              <div className="lm-Menu-itemIcon" />
            )}
            <div className="lm-Menu-itemLabel">
              {trans.__('Show Selectors')}
            </div>
          </li>
          <li
            className="lm-Menu-item"
            onClick={() => {
              props.toggleAllCommands();
              setMenuOpen(false);
            }}
          >
            {props.showAllCommands ? (
              <checkIcon.react className="lm-Menu-itemIcon" />
            ) : (
              <div className="lm-Menu-itemIcon" />
            )}
            <div className="lm-Menu-itemLabel">
              {trans.__('Show all commands')}
            </div>
          </li>
        </ul>
      )}
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
  toggleAllCommands: IShortcutUI['toggleAllCommands'];
  showAllCommands: boolean;
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
            toggleAllCommands={this.props.toggleAllCommands}
            showAllCommands={this.props.showAllCommands}
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
