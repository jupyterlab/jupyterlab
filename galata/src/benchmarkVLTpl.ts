/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

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
 * @param comparison Field name to compare
 * @returns The specification
 */
function configPerFile(
  tests: string[],
  comparison: string
): Record<string, any> {
  return {
    vconcat: tests.map(t => {
      return {
        title: t,
        transform: [{ filter: `datum.test === '${t}'` }],
        facet: {
          column: { field: 'browser', type: 'nominal' }
        },
        spec: {
          mark: { type: 'boxplot', extent: 'min-max' },
          encoding: {
            y: { field: comparison, type: 'nominal' },
            x: {
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
 * @param comparison Field name to compare
 * @param filenames Test file name list
 * @returns The specification
 */
function generateVegaLiteSpec(
  tests: string[],
  comparison: string,
  filenames?: string[]
): Record<string, any> {
  const files = filenames ?? [];

  if (files.length === 0) {
    return {
      ...GENERAL_CONFIG,
      ...configPerFile(tests, comparison)
    };
  } else {
    return {
      ...GENERAL_CONFIG,
      hconcat: files.map(b => {
        return {
          title: b,
          transform: [{ filter: `datum.file === '${b}'` }],
          ...configPerFile(tests, comparison)
        };
      })
    };
  }
}

export default generateVegaLiteSpec;
