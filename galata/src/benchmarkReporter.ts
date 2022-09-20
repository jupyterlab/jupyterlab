/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { JSONObject } from '@lumino/coreutils';
import { chromium, firefox, webkit } from '@playwright/test';
import {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult
} from '@playwright/test/reporter';
import { dists, meanpw, variancepn } from '@stdlib/stats/base';
import fs from 'fs';
import path from 'path';
import si from 'systeminformation';
import * as vega from 'vega';
import * as vl from 'vega-lite';
import * as vs from 'vega-statistics';
import generateVegaLiteSpec from './benchmarkVLTpl';

/**
 * Benchmark namespace
 */
export namespace benchmark {
  /**
   * Default benchmark output results folder
   */
  export const DEFAULT_FOLDER = 'benchmark-results';
  /**
   * Default Playwright test attachment name for benchmark
   */
  export const DEFAULT_NAME_ATTACHMENT = 'galata-benchmark';
  /**
   * Default number of samples per scenario
   */
  export const DEFAULT_NUMBER_SAMPLES = 20;
  /**
   * Default output file name
   */
  export const DEFAULT_OUTPUT = 'benchmark.json';
  /**
   * Data reference for expected results
   */
  export const DEFAULT_EXPECTED_REFERENCE = 'expected';
  /**
   * Data reference for actual results
   */
  export const DEFAULT_REFERENCE = 'actual';

  /**
   * Number of samples per scenario
   */
  export const nSamples =
    parseInt(process.env['BENCHMARK_NUMBER_SAMPLES'] ?? '0', 10) ||
    DEFAULT_NUMBER_SAMPLES;

  /**
   * Playwright test attachment for benchmark
   */
  export interface IAttachment {
    /**
     * name <string> Attachment name.
     */
    name: string;
    /**
     * contentType <string> Content type of this attachment to properly present in the report, for example 'application/json' or 'image/png'.
     */
    contentType: 'application/json' | 'image/png' | string;
    /**
     * path <void|string> Optional path on the filesystem to the attached file.
     */
    path?: string;
    /**
     * body <void|Buffer> Optional attachment body used instead of a file.
     */
    body?: Buffer;
  }

  /**
   * Benchmark test record
   */
  export interface IRecord extends Record<string, any> {
    /**
     * Test kind
     */
    test: string;
    /**
     * Browser name
     */
    browser: string;
    /**
     * Number of samples
     */
    nSamples: number;
    /**
     * Tested file name
     */
    file: string;
    /**
     * Playwright project name
     */
    project: string;
    /**
     * Test duration in milliseconds
     */
    time: number;
  }

  /**
   * Convert a record as test attachment
   *
   * @param data Data record to attach
   * @returns The attachment
   */
  export function addAttachment<IRecord>(data: IRecord): IAttachment {
    return {
      name: DEFAULT_NAME_ATTACHMENT,
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(data))
    };
  }
  /**
   * Change between two distributions
   */
  export interface IDistributionChange {
    /**
     * Mean value
     */
    mean: number;
    /**
     * Spread around the mean value
     */
    confidenceInterval: number;
  }

  /**
   * Statistical description of a distribution
   */
  interface IDistribution {
    /**
     * Mean
     */
    mean: number;
    /**
     * Variance
     */
    variance: number;
  }

  /**
   * Quantifies the performance changes between two measures systems. Assumes we gathered
   * n independent measurement from each, and calculated their means and variance.
   *
   * Based on the work by Tomas Kalibera and Richard Jones. See their paper
   * "Quantifying Performance Changes with Effect Size Confidence Intervals", section 6.2,
   * formula "Quantifying Performance Change".
   *
   * However, it simplifies it to only assume one level of benchmarks, not multiple levels.
   * If you do have multiple levels, simply use the mean of the lower levels as your data,
   * like they do in the paper.
   *
   * @param oldDistribution The old distribution description
   * @param newDistribution The new distribution description
   * @param n The number of samples from each system (must be equal)
   * @param confidenceInterval The confidence interval for the results.
   *  The default is a 95% confidence interval (95% of the time the true mean will be
   *  between the resulting mean +- the resulting CI)
   */
  function performanceChange(
    oldDistribution: IDistribution,
    newDistribution: IDistribution,
    n: number,
    confidenceInterval: number = 0.95
  ): IDistributionChange {
    const { mean: yO, variance: sO } = oldDistribution;
    const { mean: yN, variance: sN } = newDistribution;
    const dof = n - 1;
    const t = dists.t.quantile(1 - (1 - confidenceInterval) / 2, dof);
    const oldFactor = sq(yO) - (sq(t) * sO) / n;
    const newFactor = sq(yN) - (sq(t) * sN) / n;
    const meanNum = yO * yN;
    const ciNum = Math.sqrt(sq(yO * yN) - newFactor * oldFactor);
    return {
      mean: meanNum / oldFactor,
      confidenceInterval: ciNum / oldFactor
    };
  }

  /**
   * Compute the performance change based on a number of old and new measurements.
   *
   * Based on the work by Tomas Kalibera and Richard Jones. See their paper
   * "Quantifying Performance Changes with Effect Size Confidence Intervals", section 6.2,
   * formula "Quantifying Performance Change".
   *
   * However, it simplifies it to only assume one level of benchmarks, not multiple levels.
   * If you do have multiple levels, simply use the mean of the lower levels as your data,
   * like they do in the paper.
   *
   * Note: The measurements must have the same length. As fallback, you could use the minimum
   * size of the two measurement sets.
   *
   * @param oldMeasures The old measurements
   * @param newMeasures The new measurements
   * @param confidenceInterval The confidence interval for the results.
   * @param minLength Fall back to the minimum length of the two arrays
   */
  export function distributionChange(
    oldMeasures: number[],
    newMeasures: number[],
    confidenceInterval: number = 0.95,
    minLength = false
  ): IDistributionChange {
    const n = oldMeasures.length;
    if (!minLength && n !== newMeasures.length) {
      throw new Error('Data have different length');
    }
    return performanceChange(
      { mean: mean(...oldMeasures), variance: variance(...oldMeasures) },
      { mean: mean(...newMeasures), variance: variance(...newMeasures) },
      minLength ? Math.min(n, newMeasures.length) : n,
      confidenceInterval
    );
  }

  /**
   * Format a performance changes like `between 20.1% slower and 30.3% faster`.
   *
   * @param distribution The distribution change
   * @returns The formatted distribution change
   */
  export function formatChange(distribution: IDistributionChange): string {
    const { mean, confidenceInterval } = distribution;
    return `between ${formatPercent(
      mean + confidenceInterval
    )} and ${formatPercent(mean - confidenceInterval)}`;
  }

  function formatPercent(percent: number): string {
    if (percent < 1) {
      return `${((1 - percent) * 100).toFixed(1)}% faster`;
    }
    return `${((percent - 1) * 100).toFixed(1)}% slower`;
  }

  function sq(x: number): number {
    return Math.pow(x, 2);
  }

  function mean(...x: number[]): number {
    return meanpw(x.length, x, 1);
  }

  function variance(...x: number[]): number {
    return variancepn(x.length, 1, x, 1);
  }
}

/**
 * Report record interface
 */
export interface IReportRecord extends benchmark.IRecord {
  /**
   * Test suite reference
   */
  reference: string;
}

/**
 * Test suite metadata
 */
interface IMetadata {
  /**
   * Web browsers version
   */
  browsers: { [name: string]: string };
  /**
   * Benchmark information
   */
  benchmark: {
    BENCHMARK_OUTPUTFILE: string;
    BENCHMARK_REFERENCE: string;
  };
  /**
   * System information
   */
  systemInformation: {
    cpu: Record<string, any>;
    mem: Record<string, any>;
    osInfo: Record<string, any>;
  };
}

/**
 * Report interface
 */
interface IReport {
  /**
   * Test records
   */
  values: IReportRecord[];
  /**
   * Test metadata
   */
  metadata: IMetadata;
}

/**
 * Custom Playwright reporter for benchmark tests
 */
class BenchmarkReporter implements Reporter {
  /**
   * @param options
   *   - outputFile: Name of the output file (default to env BENCHMARK_OUTPUTFILE)
   *   - comparison: Logic of test comparisons: 'snapshot' or 'project'
   *      * 'snapshot': (default) This will compare the 'actual' result with the 'expected' one
   *      * 'project': This will compare the different project
   *   - vegaLiteConfigFactory: Function to create VegaLite configuration from test records; see https://vega.github.io/vega-lite/docs/.
   *   - textReportFactory: Function to create  text report from test records, this function
   *   should return the content and extension of report file.
   */
  constructor(
    options: {
      outputFile?: string;
      comparison?: 'snapshot' | 'project';
      vegaLiteConfigFactory?: (
        allData: Array<IReportRecord>,
        comparison?: 'snapshot' | 'project'
      ) => JSONObject;
      textReportFactory?: (
        allData: Array<IReportRecord>,
        comparison?: 'snapshot' | 'project'
      ) => Promise<[string, string]>;
    } = {}
  ) {
    this._outputFile =
      options.outputFile ??
      process.env['BENCHMARK_OUTPUTFILE'] ??
      benchmark.DEFAULT_OUTPUT;

    this._comparison = options.comparison ?? 'snapshot';

    this._expectedReference =
      process.env['BENCHMARK_EXPECTED_REFERENCE'] ??
      benchmark.DEFAULT_EXPECTED_REFERENCE;
    this._reference =
      process.env['BENCHMARK_REFERENCE'] ?? benchmark.DEFAULT_REFERENCE;

    this._buildVegaLiteGraph =
      options.vegaLiteConfigFactory ?? this.defaultVegaLiteConfigFactory;

    this._buildTextReport =
      options.textReportFactory ?? this.defaultTextReportFactory;
  }

  /**
   * Called once before running tests. All tests have been already discovered and put into a hierarchy of [Suite]s.
   * @param config Resolved configuration.
   * @param suite The root suite that contains all projects, files and test cases.
   */
  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
    this.suite = suite;
    this._report = new Array<IReportRecord>();
    // Clean up output folder if it exists
    if (this._outputFile) {
      const outputDir = path.resolve(
        path.dirname(this._outputFile),
        benchmark.DEFAULT_FOLDER
      );
      if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true, force: true });
      }
    }
  }

  /**
   * Called after a test has been finished in the worker process.
   * @param test Test that has been finished.
   * @param result Result of the test run.
   */
  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status === 'passed') {
      this._report.push(
        ...result.attachments
          .filter(a => a.name === benchmark.DEFAULT_NAME_ATTACHMENT)
          .map(raw => {
            const json = JSON.parse(
              raw.body?.toString() ?? '{}'
            ) as any as benchmark.IRecord;
            return { ...json, reference: this._reference };
          })
      );
    }
  }

  /**
   * Called after all tests has been run, or testing has been interrupted. Note that this method may return a [Promise] and
   * Playwright Test will await it.
   * @param result Result of the full test run. - `'passed'` - Everything went as expected.
   * - `'failed'` - Any test has failed.
   * - `'timedout'` - The
   *   [testConfig.globalTimeout](https://playwright.dev/docs/api/class-testconfig#test-config-global-timeout) has been
   *   reached.
   * - `'interrupted'` - Interrupted by the user.
   */
  async onEnd(result: FullResult): Promise<void> {
    const report = await this.buildReport();
    const reportString = JSON.stringify(report, undefined, 2);
    if (this._outputFile) {
      const outputDir = path.resolve(
        path.dirname(this._outputFile),
        benchmark.DEFAULT_FOLDER
      );
      const baseName = path.basename(this._outputFile, '.json');
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(
        path.resolve(outputDir, `${baseName}.json`),
        reportString,
        'utf-8'
      );

      const allData = [...report.values];

      if (this._comparison === 'snapshot') {
        // Test if expectations exists otherwise creates it depending on updateSnapshot value
        const expectationsFile = path.resolve(
          this.config.rootDir,
          `${baseName}-expected.json`
        );
        const hasExpectations = fs.existsSync(expectationsFile);
        let expectations: IReport;
        if (!hasExpectations || this.config.updateSnapshots === 'all') {
          expectations = {
            values: report.values.map(d => {
              return {
                ...d,
                reference: this._expectedReference
              };
            }),
            metadata: report.metadata
          };

          if (this.config.updateSnapshots !== 'none') {
            fs.writeFileSync(
              expectationsFile,
              JSON.stringify(expectations, undefined, 2),
              'utf-8'
            );
          }
        } else {
          const expected = fs.readFileSync(expectationsFile, 'utf-8');
          expectations = JSON.parse(expected);
        }

        allData.push(...expectations.values);
      }

      // - Create report
      const [reportContentString, reportExtension] =
        await this._buildTextReport(allData);
      const reportFile = path.resolve(
        outputDir,
        `${baseName}.${reportExtension}`
      );
      fs.writeFileSync(reportFile, reportContentString, 'utf-8');

      // Generate graph file and image
      const graphConfigFile = path.resolve(outputDir, `${baseName}.vl.json`);
      const config = this._buildVegaLiteGraph(allData, this._comparison);
      fs.writeFileSync(graphConfigFile, JSON.stringify(config), 'utf-8');
      const vegaSpec = vl.compile(config as any).spec;

      const view = new vega.View(vega.parse(vegaSpec), {
        renderer: 'svg'
      }).initialize();
      const svgFigure = await view.toSVG();
      const graphFile = path.resolve(outputDir, `${baseName}.svg`);
      fs.writeFileSync(graphFile, svgFigure);
    } else {
      console.log(reportString);
    }
  }

  /**
   * Default text report factory of `BenchmarkReporter`, this method will
   * be used by to generate markdown report. Users can customize the builder
   * by supplying another builder to constructor's option or override this
   * method on a sub-class.
   *
   * @param allData all test records.
   * @param comparison logic of test comparisons:
   * 'snapshot' or 'project'; default 'snapshot'.
   * @returns A list of two strings, the first one
   * is the content of report, the second one is the extension of report file.
   */
  protected async defaultTextReportFactory(
    allData: Array<IReportRecord>,
    comparison: 'snapshot' | 'project' = 'snapshot'
  ): Promise<[string, string]> {
    // Compute statistics
    // - Groupby (test, browser, reference | project, file)
    const reportExtension = 'md';

    const groups = new Map<
      string,
      Map<string, Map<string, Map<string, number[]>>>
    >();

    allData.forEach(d => {
      if (!groups.has(d.test)) {
        groups.set(
          d.test,
          new Map<string, Map<string, Map<string, number[]>>>()
        );
      }

      const testGroup = groups.get(d.test)!;

      if (!testGroup.has(d.browser)) {
        testGroup.set(d.browser, new Map<string, Map<string, number[]>>());
      }

      const browserGroup = testGroup.get(d.browser)!;

      const lastLevel = comparison === 'snapshot' ? d.reference : d.project;

      if (!browserGroup.has(lastLevel)) {
        browserGroup.set(lastLevel, new Map<string, number[]>());
      }

      const fileGroup = browserGroup.get(lastLevel)!;

      if (!fileGroup.has(d.file)) {
        fileGroup.set(d.file, new Array<number>());
      }

      fileGroup.get(d.file)?.push(d.time);
    });

    // If the reference | project lists has two items, the intervals will be compared.
    if (!groups.values().next().value) {
      return ['## Benchmark report\n\nNot enough data', reportExtension];
    }

    const compare =
      (
        groups.values().next().value?.values().next().value as Map<
          string,
          Map<string, number[]>
        >
      ).size === 2;

    // - Create report
    const reportContent = new Array<string>(
      '## Benchmark report',
      '',
      'The execution time (in milliseconds) are grouped by test file, test type and browser.',
      'For each case, the following values are computed: _min_ <- [_1st quartile_ - _median_ - _3rd quartile_] -> _max_.'
    );

    if (compare) {
      reportContent.push(
        '',
        'The mean relative comparison is computed with 95% confidence.'
      );
    }

    reportContent.push('', '<details><summary>Results table</summary>', '');

    let header = '| Test file |';
    let nFiles = 0;
    for (const [file] of groups
      .values()
      .next()
      .value.values()
      .next()
      .value.values()
      .next().value) {
      header += ` ${file} |`;
      nFiles++;
    }
    reportContent.push(header);
    reportContent.push(new Array(nFiles + 2).fill('|').join(' --- '));
    const filler = new Array(nFiles).fill('|').join(' ');

    let changeReference = this._expectedReference;

    for (const [test, testGroup] of groups) {
      reportContent.push(`| **${test}** | ` + filler);
      for (const [browser, browserGroup] of testGroup) {
        reportContent.push(`| \`${browser}\` | ` + filler);
        const actual = new Map<string, number[]>();
        const expected = new Map<string, number[]>();
        for (const [reference, fileGroup] of browserGroup) {
          let line = `| ${reference} |`;
          for (const [filename, dataGroup] of fileGroup) {
            const [q1, median, q3] = vs.quartiles(dataGroup);

            if (compare) {
              if (reference === this._reference || !actual.has(filename)) {
                actual.set(filename, dataGroup);
              } else {
                changeReference = reference;
                expected.set(filename, dataGroup);
              }
            }

            line += ` ${Math.min(
              ...dataGroup
            ).toFixed()} <- [${q1.toFixed()} - ${median.toFixed()} - ${q3.toFixed()}] -> ${Math.max(
              ...dataGroup
            ).toFixed()} |`;
          }

          reportContent.push(line);
        }

        if (compare) {
          let line = `| Mean relative change |`;
          for (const [filename, oldDistribution] of expected) {
            const newDistribution = actual.get(filename)!;
            try {
              const delta = benchmark.distributionChange(
                oldDistribution,
                newDistribution,
                0.95,
                true
              );

              let unmatchWarning = '';
              if (oldDistribution.length != newDistribution.length) {
                unmatchWarning = `[:warning:](# "Reference size ${oldDistribution.length} != Actual size ${newDistribution.length}") `;
              }

              line += ` ${unmatchWarning}${((delta.mean - 1) * 100).toFixed(
                1
              )}% ± ${(delta.confidenceInterval * 100).toFixed(1)}% |`;
            } catch (error) {
              console.error(
                `Reference has length ${oldDistribution.length} and new has ${newDistribution.length}.`
              );
              line += ` ${error} |`;
            }
          }

          reportContent.push(line);
        }
      }
    }
    if (compare) {
      reportContent.push(
        '',
        `Changes are computed with _${changeReference}_ as reference.`
      );
    }
    reportContent.push('', '</details>', '');
    const reportContentString = reportContent.join('\n');
    return [reportContentString, reportExtension];
  }

  /**
   * Default Vega Lite config factory of `BenchmarkReporter`, this method will
   * be used by to generate VegaLite configuration. Users can customize
   * the builder by supplying another builder to constructor's option or
   * override this method on a sub-class.
   *
   * @param allData all test records.
   * @param comparison logic of test comparisons:
   * 'snapshot' or 'project'; default 'snapshot'.
   * @returns VegaLite configuration
   */
  protected defaultVegaLiteConfigFactory(
    allData: Array<IReportRecord>,
    comparison: 'snapshot' | 'project' = 'snapshot'
  ): Record<string, any> {
    const config = generateVegaLiteSpec(
      [...new Set(allData.map(d => d.test))],
      comparison == 'snapshot' ? 'reference' : 'project',
      [...new Set(allData.map(d => d.file))]
    );
    config.data.values = allData;
    return config;
  }

  protected async getMetadata(browser?: string): Promise<any> {
    const cpu = await si.cpu();
    // Keep only non-variable value
    const totalMemory = (await si.mem()).total;
    // Remove some os information
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hostname, fqdn, ...osInfo } = await si.osInfo();

    const browsers = ['chromium', 'firefox', 'webkit'];
    const browserVersions: { [name: string]: string } = {};

    for (const browser of browsers) {
      try {
        switch (browser) {
          case 'chromium':
            browserVersions[browser] = (await chromium.launch()).version();
            break;
          case 'firefox':
            browserVersions[browser] = (await firefox.launch()).version();
            break;
          case 'webkit':
            browserVersions[browser] = (await webkit.launch()).version();
            break;
        }
      } catch (e) {
        // pass not installed browser
      }
    }

    return {
      browsers: browserVersions,
      benchmark: {
        BENCHMARK_OUTPUTFILE: this._outputFile,
        BENCHMARK_REFERENCE: this._reference
      },
      systemInformation: {
        cpu: cpu,
        mem: { total: totalMemory },
        osInfo: osInfo
      }
    };
  }

  protected async buildReport(): Promise<IReport> {
    return {
      values: this._report,
      metadata: await this.getMetadata()
    };
  }

  protected config: FullConfig;
  protected suite: Suite;
  private _comparison: 'snapshot' | 'project';
  private _expectedReference: string;
  private _outputFile: string;
  private _reference: string;
  private _report: IReportRecord[];
  private _buildVegaLiteGraph: (
    allData: Array<IReportRecord>,
    comparison: 'snapshot' | 'project'
  ) => Record<string, any>;
  private _buildTextReport: (
    allData: Array<IReportRecord>
  ) => Promise<[string, string]>;
}

export default BenchmarkReporter;
