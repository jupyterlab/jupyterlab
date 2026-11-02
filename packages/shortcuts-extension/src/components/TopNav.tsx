/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import type { ITranslator } from '@jupyterlab/translation';
import { addIcon, FilterBox } from '@jupyterlab/ui-components';
import * as React from 'react';

import type { IShortcutUI } from '../types';

export interface IAdvancedOptionsProps {
  toggleSelectors: IShortcutUI['toggleSelectors'];
  showSelectors: boolean;
  translator: ITranslator;
  openAddShortcutDialog: IShortcutUI['openAddShortcutDialog'];
}

function AdvancedOptions(props: IAdvancedOptionsProps): JSX.Element {
  const trans = props.translator.load('jupyterlab');
  const selectorsLabel = props.showSelectors
    ? trans.__('Hide Selectors')
    : trans.__('Show Selectors');
  const addShortcutLabel = trans.__('Add shortcut');
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
        onClick={() => void props.openAddShortcutDialog()}
        title={addShortcutLabel}
        aria-label={addShortcutLabel}
      >
        <addIcon.react tag={null} />
      </button>
    </div>
  );
}

/** State for TopNav component */
export interface ITopNavProps {
  updateSearchQuery: IShortcutUI['updateSearchQuery'];
  toggleSelectors: IShortcutUI['toggleSelectors'];
  showSelectors: boolean;
  openAddShortcutDialog: IShortcutUI['openAddShortcutDialog'];
  translator: ITranslator;
}

/** React component for top navigation */
export class TopNav extends React.Component<ITopNavProps> {
  render(): JSX.Element {
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
            openAddShortcutDialog={this.props.openAddShortcutDialog}
            translator={this.props.translator}
          />
        </div>
      </div>
    );
  }
}
