// Vega-Lite configuration

/**
 * General Vega-Lite configuration
 */
const GENERAL_CONFIG = {
  $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
  description: 'Box plots of some action time.',
  title: 'Duration of common actions',
  data: {} as Record<string, any>,
  config: { facet: { spacing: 80 } }
};

/**
 * Matrix of figures per browser
 */
const CONFIG_PER_FILE = {
  facet: {
    column: { field: 'browser', type: 'nominal' },
    row: { field: 'test', type: 'nominal' }
  },
  spec: {
    mark: { type: 'boxplot', extent: 'min-max' },
    encoding: {
      x: { field: 'reference', type: 'nominal' },
      // color: { field: 'file', type: 'nominal', legend: null },
      y: {
        field: 'time',
        title: 'Time (ms)',
        type: 'quantitative',
        scale: { zero: false }
      }
    }
  }
};

/**
 * Generate the Vega-Lite specification for test
 *
 * Note: The data field is set to empty
 *
 * @param filenames Test file name list
 * @returns The specification
 */
function generateVegaLiteSpec(filenames?: string[]): Record<string, any> {
  const files = filenames ?? [];

  if (files.length === 0) {
    return {
      ...GENERAL_CONFIG,
      ...CONFIG_PER_FILE
    };
  } else {
    return {
      ...GENERAL_CONFIG,
      hconcat: files.map(b => {
        return {
          title: b,
          transform: [{ filter: `datum.file === '${b}'` }],
          ...CONFIG_PER_FILE
        };
      })
    };
  }
}

export default generateVegaLiteSpec;
