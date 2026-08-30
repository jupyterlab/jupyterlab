/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import type { ITranslator } from '@jupyterlab/translation';
import {
  addIcon,
  caretDownEmptyIcon,
  FilterBox
} from '@jupyterlab/ui-components';
import * as React from 'react';

import { ShortcutTitleItem } from './ShortcutTitleItem';
import type { IShortcutUI } from '../types';

export interface IAdvancedOptionsProps {
  toggleSelectors: IShortcutUI['toggleSelectors'];
  showSelectors: boolean;
  showAddCommand: boolean;
  translator: ITranslator;
  toggleAddCommandRow: IShortcutUI['toggleAddCommandRow'];
}

function AdvancedOptions(props: IAdvancedOptionsProps): JSX.Element {
  const trans = props.translator.load('jupyterlab');
  const selectorsLabel = props.showSelectors
    ? trans.__('Hide Selectors')
    : trans.__('Show Selectors');
  const addShortcutLabel = props.showAddCommand
    ? trans.__('Collapse new shortcut row')
    : trans.__('Add shortcut');
  return (
    <div className="jp-Shortcuts-AdvancedOptions">
      <button
        type="button"
        className="jp-Button jp-mod-styled jp-mod-reject jp-Shortcuts-SelectorsToggle"
        aria-pressed={props.showSelectors}
        onClick={() => props.toggleSelectors()}
      >
        {selectorsLabel}
      </button>
      <button
        type="button"
        className="jp-Button jp-mod-styled jp-mod-accept jp-Shortcuts-AddShortcut jp-Shortcuts-Icon"
        aria-pressed={props.showAddCommand}
        onClick={props.toggleAddCommandRow}
        title={addShortcutLabel}
        aria-label={addShortcutLabel}
      >
        {props.showAddCommand ? (
          <caretDownEmptyIcon.react tag={null} />
        ) : (
          <addIcon.react tag={null} />
        )}
      </button>
    </div>
  );
}

/** State for TopNav component */
export interface ITopNavProps {
  updateSearchQuery: IShortcutUI['updateSearchQuery'];
  toggleSelectors: IShortcutUI['toggleSelectors'];
  showSelectors: boolean;
  showAddCommand: boolean;
  updateSort: IShortcutUI['updateSort'];
  currentSort: string;
  toggleAddCommandRow: IShortcutUI['toggleAddCommandRow'];
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
            showAddCommand={this.props.showAddCommand}
            toggleAddCommandRow={this.props.toggleAddCommandRow}
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
