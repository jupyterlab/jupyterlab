/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import type { ITranslator } from '@jupyterlab/translation';
import {
  caretDownEmptyThinIcon,
  caretUpDownEmptyThinIcon,
  caretUpEmptyThinIcon
} from '@jupyterlab/ui-components';
import * as React from 'react';
import type { IShortcutUI } from '../types';

export interface IShortcutTitleItemProps {
  title: string;
  updateSort: IShortcutUI['updateSort'];
  active: IShortcutUI.ColumnId;
  sortDirection: IShortcutUI.SortDirection;
  columnId: IShortcutUI.ColumnId;
  translator: ITranslator;
}

export class ShortcutTitleItem extends React.Component<IShortcutTitleItemProps> {
  render(): JSX.Element {
    const trans = this.props.translator.load('jupyterlab');
    const isActive = this.props.columnId === this.props.active;
    const SortIcon = !isActive
      ? caretUpDownEmptyThinIcon
      : this.props.sortDirection === 'ascending'
        ? caretUpEmptyThinIcon
        : caretDownEmptyThinIcon;
    const ariaLabel = !isActive
      ? trans.__('%1, not sorted', this.props.title)
      : this.props.sortDirection === 'ascending'
        ? trans.__('%1, sorted ascending', this.props.title)
        : trans.__('%1, sorted descending', this.props.title);

    return (
      <button
        type="button"
        className={
          isActive
            ? 'jp-Shortcuts-Header jp-Shortcuts-CurrentHeader'
            : 'jp-Shortcuts-Header'
        }
        onClick={() => this.props.updateSort(this.props.columnId)}
        aria-label={ariaLabel}
      >
        {this.props.title}
        <SortIcon.react
          tag="span"
          className="jp-Shortcuts-SortButton jp-ShortcutTitleItem-sortButton"
        />
      </button>
    );
  }
}
