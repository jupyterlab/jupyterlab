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
    test: string;
    browser: string;
    nSamples: number;
    file: string;
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
interface IReportRecord extends benchmark.IRecord {
  /**
   * Test suite reference
   */
  reference: string;
}

/**
 * Test suite metadata
 */
interface IMetadata {
  browsers: { [name: string]: string };
  benchmark: {
    BENCHMARK_OUTPUTFILE: string;
    BENCHMARK_REFERENCE: string;
  };
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
  values: IReportRecord[];
  metadata: IMetadata;
}

/**
 * Custom Playwright reporter for benchmark tests
 */
class BenchmarkReporter implements Reporter {
  constructor(options: { outputFile?: string; reference?: string } = {}) {
    this._outputFile =
      options.outputFile ??
      process.env['BENCHMARK_OUTPUTFILE'] ??
      benchmark.DEFAULT_OUTPUT;
    this._reference =
      options.reference ??
      process.env['BENCHMARK_REFERENCE'] ??
      benchmark.DEFAULT_REFERENCE;
  }

  /**
   * Called once before running tests. All tests have been already discovered and put into a hierarchy of [Suite]s.
   * @param config Resolved configuration.
   * @param suite The root suite that contains all projects, files and test cases.
   */
  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
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
    test.titlePath;
    if (result.status === 'passed') {
      const data = result.attachments.find(
        a => a.name === benchmark.DEFAULT_NAME_ATTACHMENT
      );
      if (data) {
        const json = (JSON.parse(
          data.body?.toString() ?? '{}'
        ) as any) as benchmark.IRecord;
        this._report.push({ ...json, reference: this._reference });
      }
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

      // Create graph file
      const graphConfigFile = path.resolve(outputDir, `${baseName}.vl.json`);
      const allData = [...expectations.values, ...report.values];
      const config = generateVegaLiteSpec([
        ...new Set(allData.map(d => d.file))
      ]);
      config.data.values = allData;
      fs.writeFileSync(graphConfigFile, JSON.stringify(config), 'utf-8');

      // Generate image
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

  protected async getMetadata(browser?: string): Promise<any> {
    const cpu = await si.cpu();
    const mem = await si.mem();
    const osInfo = await si.osInfo();

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
        mem: mem,
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
  private _outputFile: string;
  private _reference: string;
  private _report: IReportRecord[];
}

export default BenchmarkReporter;
