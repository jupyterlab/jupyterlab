import { IWidgetViewerOptions } from '@jupyterlab/databus';
import { DataGrid } from '@phosphor/datagrid';
import { DSVModel } from './model';

export const CSVConverter: IWidgetViewerOptions<string> = {
  mimeType: 'text/csv',
  label: 'Grid',
  view: async (data: string) => {
    // Copies the default grid setup from `widget.ts`
    // It would be great to use `CSVViewer` itself,
    // But it assumes a model that changes over time, whereas
    // we just have a static string.
    const grid = new DataGrid({
      baseRowSize: 24,
      baseColumnSize: 144,
      baseColumnHeaderSize: 36,
      baseRowHeaderSize: 64
    });
    grid.headerVisibility = 'all';
    grid.model = new DSVModel({ data, delimiter: ',' });
    return grid;
  }
};
