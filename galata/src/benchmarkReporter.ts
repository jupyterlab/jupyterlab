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
import * as canvas from 'canvas';
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
        comparison: 'snapshot' | 'project'
      ) => JSONObject;
      textReportFactory?: (
        allData: Array<IReportRecord>
      ) => Promise<[string, string]>;
    } = {}
  ) {
    this._outputFile =
      options.outputFile ??
      process.env['BENCHMARK_OUTPUTFILE'] ??
      benchmark.DEFAULT_OUTPUT;

    this._comparison = options.comparison ?? 'snapshot';

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
            const json = (JSON.parse(
              raw.body?.toString() ?? '{}'
            ) as any) as benchmark.IRecord;
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
              return { ...d, reference: benchmark.DEFAULT_EXPECTED_REFERENCE };
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
      const [
        reportContentString,
        reportExtension
      ] = await this._buildTextReport(allData);
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
        renderer: 'canvas'
      }).initialize();
      const canvas = ((await view.toCanvas()) as any) as canvas.Canvas;
      const graphFile = path.resolve(outputDir, `${baseName}.png`);
      const fileStream = fs.createWriteStream(graphFile);

      // Wait for pipe operation to finish
      let resolver: (v: unknown) => void;
      const waitForPipe = new Promise(resolve => {
        resolver = resolve;
      });
      fileStream.once('finish', () => {
        resolver(void 0);
      });

      const stream = canvas.createPNGStream();
      stream.pipe(fileStream, {});

      await waitForPipe;
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
   * @param {Array<IReportRecord>} allData: all test records.
   * @return {Promise<[string, string]>} A list of two strings, the first one
   * is the content of report, the second one is the extension of report file.
   */
  protected async defaultTextReportFactory(
    allData: Array<IReportRecord>
  ): Promise<[string, string]> {
    // Compute statistics
    // - Groupby (test, browser, reference, file)

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

      if (!browserGroup.has(d.reference)) {
        browserGroup.set(d.reference, new Map<string, number[]>());
      }

      const fileGroup = browserGroup.get(d.reference)!;

      if (!fileGroup.has(d.file)) {
        fileGroup.set(d.file, new Array<number>());
      }

      fileGroup.get(d.file)?.push(d.time);
    });

    // - Create report
    const reportContent = new Array<string>(
      '## Benchmark report',
      '',
      'The execution time (in milliseconds) are grouped by test file, test type and browser.',
      'For each case, the following values are computed: _min_ <- [_1st quartile_ - _median_ - _3rd quartile_] -> _max_.',
      '',
      '<details><summary>Results table</summary>',
      ''
    );

    let header = '| Test file |';
    let nFiles = 0;
    for (const [
      file
    ] of groups.values().next().value.values().next().value.values().next()
      .value) {
      header += ` ${file} |`;
      nFiles++;
    }
    reportContent.push(header);
    reportContent.push(new Array(nFiles + 2).fill('|').join(' --- '));
    const filler = new Array(nFiles).fill('|').join(' ');

    for (const [test, testGroup] of groups) {
      reportContent.push(`| **${test}** | ` + filler);
      for (const [browser, browserGroup] of testGroup) {
        reportContent.push(`| \`${browser}\` | ` + filler);
        for (const [reference, fileGroup] of browserGroup) {
          let line = `| ${reference} |`;
          for (const [_, dataGroup] of fileGroup) {
            const [q1, median, q3] = vs.quartiles(dataGroup);
            line += ` ${Math.min(
              ...dataGroup
            ).toFixed()} <- [${q1.toFixed()} - ${median.toFixed()} - ${q3.toFixed()}] -> ${Math.max(
              ...dataGroup
            ).toFixed()} |`;
          }

          reportContent.push(line);
        }
      }
    }
    reportContent.push('', '</details>', '');
    const reportExtension = 'md';
    const reportContentString = reportContent.join('\n');
    return [reportContentString, reportExtension];
  }

  /**
   * Default Vega Lite config factory of `BenchmarkReporter`, this method will
   * be used by to generate VegaLite configuration. Users can customize
   * the builder by supplying another builder to constructor's option or
   * override this method on a sub-class.
   * @param {Array<IReportRecord>} allData: all test records.
   * @param {('snapshot' | 'project')} comparison: logic of test comparisons:
   * 'snapshot' or 'project'.
   * @return {*}  {Record<string, any>} :  VegaLite configuration
   */
  protected defaultVegaLiteConfigFactory(
    allData: Array<IReportRecord>,
    comparison: 'snapshot' | 'project'
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
