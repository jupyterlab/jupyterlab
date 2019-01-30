import { StaticVisualizer, IDataset } from '@jupyterlab/databus';
import { DataGrid } from '@phosphor/datagrid';
import { DSVModel } from './model';
import { Widget } from '@phosphor/widgets';
export class CSVVisualizer extends StaticVisualizer<IDataset<string>> {
  mimeType: 'text/csv';
  label: 'Data Grid';
  async visualize({ data }: IDataset<string>): Promise<Widget> {
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
    // For now we aren't setting the styles at all, so they don't update for dark themes.
    return grid;
  }
}
