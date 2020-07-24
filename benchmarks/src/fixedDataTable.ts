import makeNotebook from './makeNotebook';
import NotebookType from './notebookType';

const ROWS = 5000;
const COLUMNS = 50;

export default {
  label: `n fixed data table outputs each with ${COLUMNS} columns and ${ROWS} rows`,
  waitFor: async () => null,
  notebook: (n: number) =>
    makeNotebook([
      {
        cell_type: 'code',
        execution_count: 1,
        metadata: {},
        outputs: [],
        source: [
          'from IPython.display import display\n',
          "def Table(data=''):\n",
          '    bundle = {}\n',
          "    bundle['text/csv'] = data\n",
          '    display(bundle, raw=True)\n',
          '    \n',
          `example_data = '\\n'.join(';'.join([str(x) for x in range(${COLUMNS})]) for y in range(${ROWS}))\n`
        ]
      },
      ...Array.from({ length: n }, () => ({
        cell_type: 'code',
        execution_count: 1,
        metadata: {},
        outputs: [
          {
            data: {
              'text/csv': Array.from({ length: ROWS }, () =>
                Array.from({ length: COLUMNS }, (_, i) => i).join(';')
              )
            },
            metadata: {},
            output_type: 'display_data'
          }
        ],
        source: ['Table(example_data)']
      }))
    ])
} as NotebookType;
