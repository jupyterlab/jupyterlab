import { Converter, staticWidgetConverter } from '@jupyterlab/databus';
import { DataGrid } from '@phosphor/datagrid';
import { Widget } from '@phosphor/widgets';
import { DSVModel } from './model';

export const CSVConverter: Converter<string, Widget> = staticWidgetConverter({
  mimeType: 'text/csv',
  label: 'Grid',
  convert: async (data: string) => {
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
});
