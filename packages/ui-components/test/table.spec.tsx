// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { framePromise } from '@jupyterlab/testing';
import { ReactWidget, Table } from '@jupyterlab/ui-components';
import { Widget } from '@lumino/widgets';
import React from 'react';

interface IRowData {
  name: string;
  value: number;
}

describe('Table', () => {
  let host: HTMLElement;
  let widget: ReactWidget;

  const rows: Table.IRow<IRowData>[] = [
    { key: '1', data: { name: 'Alpha', value: 1 } },
    { key: '2', data: { name: 'Beta', value: 2 } }
  ];

  const createColumns = (
    overrides?: Partial<Table.IColumn<IRowData>>
  ): Table.IColumn<IRowData>[] => [
    {
      id: 'name',
      label: 'Name',
      renderCell: data => data.name,
      sort: (a, b) => a.name.localeCompare(b.name),
      ...overrides
    },
    {
      id: 'value',
      label: 'Value',
      renderCell: data => data.value,
      sort: (a, b) => a.value - b.value
    }
  ];

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    if (widget && !widget.isDisposed) {
      widget.dispose();
    }
    host.remove();
  });

  it('should render resize handles by default and omit them when resizable is false', async () => {
    widget = ReactWidget.create(
      <Table<IRowData>
        rows={rows}
        columns={createColumns()}
        blankIndicator={() => null}
      />
    );
    Widget.attach(widget, host);
    await framePromise();
    await framePromise();
    expect(host.querySelectorAll('.jp-sortable-table-resizer')).toHaveLength(2);

    widget.dispose();
    widget = ReactWidget.create(
      <Table<IRowData>
        rows={rows}
        columns={createColumns()}
        resizable={false}
        blankIndicator={() => null}
      />
    );
    Widget.attach(widget, host);
    await framePromise();
    await framePromise();
    expect(host.querySelectorAll('.jp-sortable-table-resizer')).toHaveLength(0);
  });

  it('should resize column header and cells on drag without triggering sort', async () => {
    widget = ReactWidget.create(
      <Table<IRowData>
        rows={rows}
        columns={createColumns({ initialWidth: 120, minWidth: 60 })}
        sortKey="name"
        blankIndicator={() => null}
      />
    );
    Widget.attach(widget, host);
    await framePromise();

    const th = host.querySelector('th[data-id="name"]') as HTMLTableCellElement;
    const resizer = th.querySelector(
      '.jp-sortable-table-resizer'
    ) as HTMLElement;
    expect(resizer).not.toBeNull();

    jest
      .spyOn(th, 'getBoundingClientRect')
      .mockReturnValue({ width: 120 } as DOMRect);

    resizer.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, clientX: 120 })
    );
    window.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, clientX: 200 })
    );
    window.dispatchEvent(
      new MouseEvent('mouseup', { bubbles: true, clientX: 200 })
    );
    resizer.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await framePromise();

    expect(th.style.width).toBe('200px');
    const firstTd = host.querySelector(
      'tbody tr:first-child td:first-child'
    ) as HTMLTableCellElement;
    expect(firstTd.style.width).toBe('200px');
    // Sort order should remain unchanged (Alpha first)
    expect(firstTd.textContent).toBe('Alpha');
  });

  it('should clamp resized column width to minWidth', async () => {
    widget = ReactWidget.create(
      <Table<IRowData>
        rows={rows}
        columns={createColumns({ initialWidth: 100, minWidth: 80 })}
        blankIndicator={() => null}
      />
    );
    Widget.attach(widget, host);
    await framePromise();

    const th = host.querySelector('th[data-id="name"]') as HTMLTableCellElement;
    const resizer = th.querySelector(
      '.jp-sortable-table-resizer'
    ) as HTMLElement;
    jest
      .spyOn(th, 'getBoundingClientRect')
      .mockReturnValue({ width: 100 } as DOMRect);

    resizer.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, clientX: 100 })
    );
    window.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, clientX: 20 })
    );
    window.dispatchEvent(
      new MouseEvent('mouseup', { bubbles: true, clientX: 20 })
    );
    await framePromise();

    expect(th.style.width).toBe('80px');
  });

  it('should apply ellipsis class when column overflow is ellipsis', async () => {
    widget = ReactWidget.create(
      <Table<IRowData>
        rows={rows}
        columns={createColumns({ overflow: 'ellipsis' })}
        blankIndicator={() => null}
      />
    );
    Widget.attach(widget, host);
    await framePromise();

    const firstTd = host.querySelector(
      'tbody tr:first-child td:first-child'
    ) as HTMLTableCellElement;
    expect(
      firstTd.classList.contains('jp-sortable-table-cell-ellipsis')
    ).toBe(true);
  });
});

