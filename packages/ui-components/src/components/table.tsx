/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import type { ReactElement, ReactNode } from 'react';
import React, { useEffect, useRef, useState } from 'react';
import { caretDownIcon, caretUpIcon } from '../icon';

export const TABLE_CLASS = 'jp-sortable-table';
const DEFAULT_MIN_COLUMN_WIDTH = 40;

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
    /**
     * Whether columns can be resized by dragging header edges. Defaults to true.
     */
    resizable?: boolean;
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
    /**
     * Minimum column width in pixels when resizing. Defaults to 40.
     */
    minWidth?: number;
    /**
     * Optional initial column width in pixels.
     */
    initialWidth?: number;
    /**
     * Cell content overflow behavior when column width is constrained.
     */
    overflow?: 'wrap' | 'ellipsis';
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
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    () => {
      const initial: Record<string, number> = {};
      for (const column of props.columns) {
        if (column.initialWidth !== undefined) {
          initial[column.id] = column.initialWidth;
        }
      }
      return initial;
    }
  );
  const tableRef = useRef<HTMLTableElement | null>(null);
  const cleanupResizeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupResizeRef.current?.();
    };
  }, []);

  const isResizable = props.resizable !== false;

  const startResize = (
    columnId: string,
    minWidth: number,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    cleanupResizeRef.current?.();

    const th = event.currentTarget.closest('th');
    if (!th) {
      return;
    }
    const startX = event.clientX;
    const startWidth = th.getBoundingClientRect().width;

    // Snapshot current rendered widths of all columns so switching to fixed layout does not shift siblings.
    const baselineWidths: Record<string, number> = {};
    tableRef.current
      ?.querySelectorAll<HTMLTableCellElement>('thead th[data-id]')
      .forEach(header => {
        const id = header.dataset.id;
        if (id) {
          baselineWidths[id] =
            columnWidths[id] ?? header.getBoundingClientRect().width;
        }
      });

    const onMouseMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.max(
        minWidth,
        Math.round(startWidth + (moveEvent.clientX - startX))
      );
      setColumnWidths(prev => ({
        ...baselineWidths,
        ...prev,
        [columnId]: nextWidth
      }));
    };

    const cleanup = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', cleanup);
      cleanupResizeRef.current = null;
    };

    cleanupResizeRef.current = cleanup;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', cleanup);
  };

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
      (a, b) => (sorter(a.data, b.data) ?? 0) * sortState.sortDirection
    );
  }

  const visibleColumns = props.columns.filter(
    column =>
      (column.isAvailable ? column.isAvailable() : true) && !column.isHidden
  );

  const elements = rows.map(row => {
    const cells = visibleColumns.map(column => {
      const width = columnWidths[column.id];
      return (
        <td
          key={column.id + '-' + row.key}
          className={
            column.overflow === 'ellipsis'
              ? 'jp-sortable-table-cell-ellipsis'
              : undefined
          }
          style={
            width !== undefined
              ? { width: `${width}px`, maxWidth: `${width}px` }
              : undefined
          }
        >
          {column.renderCell(row.data)}
        </td>
      );
    });

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
      width={columnWidths[column.id]}
      resizable={isResizable}
      onResizeStart={event =>
        startResize(
          column.id,
          column.minWidth ?? DEFAULT_MIN_COLUMN_WIDTH,
          event
        )
      }
      onSort={() => {
        sort(column.id);
      }}
    />
  ));

  const hasExplicitWidths = Object.keys(columnWidths).length > 0;

  return (
    <table
      ref={tableRef}
      className={
        hasExplicitWidths ? `${TABLE_CLASS} jp-sortable-table-fixed` : TABLE_CLASS
      }
    >
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
  width?: number;
  resizable: boolean;
  onResizeStart: (event: React.MouseEvent<HTMLDivElement>) => void;
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
      style={
        props.width !== undefined
          ? { width: `${props.width}px`, maxWidth: `${props.width}px` }
          : undefined
      }
    >
      <div className="jp-sortable-table-th-wrapper">
        <label>{props.label}</label>
        <sortIcon.react tag="span" className="jp-sort-icon" />
      </div>
      {props.resizable && (
        <div
          className="jp-sortable-table-resizer"
          role="separator"
          aria-orientation="vertical"
          onMouseDown={props.onResizeStart}
          onClick={event => event.stopPropagation()}
        />
      )}
    </th>
  );
}
