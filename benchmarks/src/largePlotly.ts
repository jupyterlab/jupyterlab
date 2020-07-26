import makeNotebook from './makeNotebook';
import waitForPlotly from './waitForPlotly';
import NotebookType from './notebookType';

export default {
  label: '4 plotly outputs each with 1000 n points',
  waitFor: waitForPlotly,
  notebook: (n: number) =>
    makeNotebook([
      {
        cell_type: 'code',
        execution_count: 1,
        metadata: {},
        outputs: [],
        source: [
          'import plotly.graph_objects as go\n',
          `data = list(range(${n}))\n`,
          'fig = go.Figure(data=go.Scatter(y=data, x=data))'
        ]
      },
      ...Array.from({ length: 4 }, () => ({
        cell_type: 'code',
        execution_count: 1,
        metadata: {},
        outputs: [
          {
            data: {
              'application/vnd.plotly.v1+json': {
                config: {
                  plotlyServerURL: 'https://plot.ly'
                },
                data: [
                  (points => ({
                    type: 'scatter',
                    x: points,
                    y: points
                  }))(Array.from({ length: n * 10 }, (_, i) => i))
                ],
                layout: {
                  autosize: true
                }
              }
            },
            metadata: {},
            output_type: 'display_data'
          }
        ],
        source: ['fig']
      }))
    ])
} as NotebookType;
