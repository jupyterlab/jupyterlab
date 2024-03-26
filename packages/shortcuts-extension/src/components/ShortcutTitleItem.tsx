/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { caretDownEmptyThinIcon } from '@jupyterlab/ui-components';
import * as React from 'react';
import { IShortcutUI } from '../types';

export interface IShortcutTitleItemProps {
  title: string;
  updateSort: IShortcutUI['updateSort'];
  active: string;
  columnId: IShortcutUI.ColumnId;
}

export class ShortcutTitleItem extends React.Component<IShortcutTitleItemProps> {
  render(): JSX.Element {
    return (
      <div
        className={
          this.props.title.toLowerCase() === this.props.active
            ? 'jp-Shortcuts-Header jp-Shortcuts-CurrentHeader'
            : 'jp-Shortcuts-Header'
        }
        onClick={() => this.props.updateSort(this.props.columnId)}
      >
        {this.props.title}
        <caretDownEmptyThinIcon.react
          className={'jp-Shortcuts-SortButton jp-ShortcutTitleItem-sortButton'}
        />
      </div>
    );
  }
}
