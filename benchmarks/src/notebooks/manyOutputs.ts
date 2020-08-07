/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
import makeNotebook from './../makeNotebook';
import NotebookType from './../notebookType';

export default {
  label: '100 n outputs each of a div',
  waitFor: async () => null,
  notebook: (n: number) =>
    makeNotebook([
      {
        cell_type: 'code',
        execution_count: 1,
        metadata: {},
        outputs: Array.from({ length: n * 100 }, (_, i) => ({
          data: {
            'text/plain': [
              `'I am a long string which is repeatedly added to the dom in separated divs: ${i}'`
            ]
          },
          metadata: {},
          output_type: 'display_data'
        })),
        source: [
          'from IPython.display import display\n',
          '\n',
          `for i in range(${n * 100}):\n`,
          "    display('I am a long string which is repeatedly added to the dom in separated divs: %d' % i)"
        ]
      }
    ])
} as NotebookType;
