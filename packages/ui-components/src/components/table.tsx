/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import React, { ReactElement, ReactNode, useState } from 'react';
import { caretDownIcon, caretUpIcon } from '../icon';

export const TABLE_CLASS = 'jp-sortable-table';

/**
 * A namespace for Table.
 */
export namespace Table {
  /**
   * The state which will be restored from layout tracker.
   */
  export interface ISortState {
    sortKey?: string | null;
    sortDirection: -1 | 1;
  }
  /**
   * The initialization options for the table.
   */
  export interface IOptions<T> extends Partial<ISortState> {
    rows: IRow<T>[];
    columns: IColumn<T>[];
    onRowClick?: React.MouseEventHandler<HTMLTableRowElement>;
    blankIndicator: () => ReactNode;
  }
  /**
   * Table row with data to display.
   */
  export interface IRow<T> {
    data: T;
    key: string;
  }
  /**
   * Column definition.
   */
  export interface IColumn<T> {
    id: string;
    label: string;
    renderCell(data: T): ReactNode;
    sort(a: T, b: T): number | undefined;
    isAvailable?(): boolean;
    isHidden?: boolean;
  }
}

/**
 * Sortable table component for small datasets.
 *
 * For large datasets use `DataGrid` from `@lumino/datagrid`.
 */
export function Table<T>(props: Table.IOptions<T>) {
  const [sortState, setSortState] = useState<Table.ISortState>({
    sortKey: props.sortKey,
    sortDirection: props.sortDirection || 1
  });

  const sort = (key: string) => {
    if (key === sortState.sortKey) {
      setSortState({
        sortKey: key,
        sortDirection: (sortState.sortDirection * -1) as -1 | 1
      });
    } else {
      setSortState({ sortKey: key, sortDirection: 1 });
    }
  };

  let rows = props.rows;
  const sortedColumn = props.columns.filter(
    column => column.id === sortState.sortKey
  )[0];

  if (sortedColumn) {
    const sorter = sortedColumn.sort.bind(sortedColumn);
    rows = props.rows.sort(
      (a, b) => sorter(a.data, b.data) * sortState.sortDirection
    );
  }

  const visibleColumns = props.columns.filter(
    column =>
      (column.isAvailable ? column.isAvailable() : true) && !column.isHidden
  );

  const elements = rows.map(row => {
    const cells = visibleColumns.map(column => (
      <td key={column.id + '-' + row.key}>{column.renderCell(row.data)}</td>
    ));

    return (
      <tr
        key={row.key}
        data-key={row.key}
        onClick={props.onRowClick}
        className={'jp-sortable-table-tr'}
      >
        {cells}
      </tr>
    );
  });

  const columnsHeaders = visibleColumns.map(column => (
    <SortableTH
      label={column.label}
      id={column.id}
      state={sortState}
      key={column.id}
      onSort={() => {
        sort(column.id);
      }}
    />
  ));

  return (
    <table className={TABLE_CLASS}>
      <thead>
        <tr className={'jp-sortable-table-tr'}>{columnsHeaders}</tr>
      </thead>
      <tbody>{elements}</tbody>
    </table>
  );
}

function SortableTH(props: {
  id: string;
  label: string;
  state: Table.ISortState;
  onSort: () => void;
}): ReactElement {
  const isSortKey = props.id === props.state.sortKey;
  const sortIcon =
    !isSortKey || props.state.sortDirection === 1 ? caretUpIcon : caretDownIcon;
  return (
    <th
      key={props.id}
      onClick={() => props.onSort()}
      className={isSortKey ? 'jp-sorted-header' : undefined}
      data-id={props.id}
    >
      <div className="jp-sortable-table-th-wrapper">
        <label>{props.label}</label>
        <sortIcon.react tag="span" className="jp-sort-icon" />
      </div>
    </th>
  );
}
