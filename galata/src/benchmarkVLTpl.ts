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
 * Matrix of figures per test file
 *
 * @param tests Kind of test
 * @returns The specification
 */
function configPerFile(tests: string[]): Record<string, any> {
  return {
    vconcat: tests.map(t => {
      return {
        title: t,
        transform: [{ filter: `datum.test === '${t}'` }],
        facet: {
          column: { field: 'browser', type: 'nominal' }
          // row: { field: 'test', type: 'nominal' }
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
    })
  };
}

/**
 * Generate the Vega-Lite specification for test
 *
 * Note: The data field is set to empty
 *
 * @param tests Kind of test
 * @param filenames Test file name list
 * @returns The specification
 */
function generateVegaLiteSpec(
  tests: string[],
  filenames?: string[]
): Record<string, any> {
  const files = filenames ?? [];

  if (files.length === 0) {
    return {
      ...GENERAL_CONFIG,
      ...configPerFile(tests)
    };
  } else {
    return {
      ...GENERAL_CONFIG,
      hconcat: files.map(b => {
        return {
          title: b,
          transform: [{ filter: `datum.file === '${b}'` }],
          ...configPerFile(tests)
        };
      })
    };
  }
}

export default generateVegaLiteSpec;
