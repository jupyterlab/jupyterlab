/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

/* eslint-disable camelcase */
// Copyright (c) Jupyter Development Team.

import { ChildProcess, spawn } from 'child_process';
import merge from 'deepmerge';
import * as fs from 'fs';
import * as path from 'path';

import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import { JSONObject, PromiseDelegate, UUID } from '@lumino/coreutils';
import { sleep } from './common';

/**
 * A Jupyter Server that runs as a child process.
 *
 * ### Notes
 * There can only be one running server at a time, since
 * PageConfig is global.  Any classes that use `ServerConnection.ISettings`
 * such as `ServiceManager` should be instantiated after the server
 * has fully started so they pick up the right `PageConfig`.
 *
 * #### Example
 * ```typescript
 * const server = new JupyterServer();
 *
 * beforeAll(async () => {
 *   await server.start();
 * }, 30000);
 *
 * afterAll(async () => {
 *  await server.shutdown();
 * });
 * ```
 *
 */
export class JupyterServer {
  /**
   * Start the server.
   *
   * @returns A promise that resolves with the url of the server
   *
   * @throws Error if another server is still running.
   */
  async start(options: Partial<JupyterServer.IOptions> = {}): Promise<string> {
    if (Private.child !== null) {
      throw Error('Previous server was not disposed');
    }
    const startDelegate = new PromiseDelegate<string>();

    const env = {
      JUPYTER_CONFIG_DIR: Private.handleConfig(options),
      JUPYTER_DATA_DIR: Private.handleData(options),
      JUPYTER_RUNTIME_DIR: Private.mktempDir('jupyter_runtime'),
      IPYTHONDIR: Private.mktempDir('ipython'),
      PATH: process.env.PATH
    };

    // Create the child process for the server.
    const child = (Private.child = spawn('jupyter-lab', { env }));

    let started = false;

    // Handle server output.
    const handleOutput = (output: string) => {
      console.debug(output);

      if (started) {
        return;
      }
      const baseUrl = Private.handleStartup(output);
      if (baseUrl) {
        console.debug('Jupyter Server started');
        started = true;
        void Private.connect(baseUrl, startDelegate);
      }
    };

    child.stdout.on('data', data => {
      handleOutput(String(data));
    });

    child.stderr.on('data', data => {
      handleOutput(String(data));
    });

    const url = await startDelegate.promise;
    return url;
  }

  /**
   * Shut down the server, waiting for it to exit gracefully.
   */
  async shutdown(): Promise<void> {
    if (!Private.child) {
      return Promise.resolve(void 0);
    }
    const stopDelegate = new PromiseDelegate<void>();
    const child = Private.child;
    child.on('exit', code => {
      Private.child = null;
      if (code !== null && code !== 0) {
        stopDelegate.reject('child process exited with code ' + String(code));
      } else {
        stopDelegate.resolve(void 0);
      }
    });

    child.kill();
    window.setTimeout(() => {
      if (Private.child) {
        Private.child.kill(9);
      }
    }, 3000);

    return stopDelegate.promise;
  }
}

/**
 * A namespace for JupyterServer static values.
 */
export namespace JupyterServer {
  /**
   * Options used to create a new JupyterServer instance.
   */
  export interface IOptions {
    /**
     * Additional Page Config values.
     */
    pageConfig: { [name: string]: string };
    /**
     * Additional traitlet config data.
     */
    configData: JSONObject;
    /**
     * Map of additional kernelspec names to kernel.json dictionaries
     */
    additionalKernelSpecs: JSONObject;
  }
}

/**
 * A namespace for module private data.
 */
namespace Private {
  export let child: ChildProcess | null = null;

  /**
   * Make a temporary directory.
   *
   * @param suffix the last portion of the dir naem.
   */
  export function mktempDir(suffix: string): string {
    const pathPrefix = '/tmp/jupyterServer';
    if (!fs.existsSync(pathPrefix)) {
      fs.mkdirSync(pathPrefix);
    }
    return fs.mkdtempSync(`${pathPrefix}/${suffix}`);
  }

  /**
   * Install a spec in the data directory.
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  export function installSpec(dataDir: string, name: string, spec: any): void {
    const specDir = path.join(dataDir, 'kernels', name);
    fs.mkdirSync(specDir, { recursive: true });
    fs.writeFileSync(path.join(specDir, 'kernel.json'), JSON.stringify(spec));
    PageConfig.setOption(`__kernelSpec_${name}`, JSON.stringify(spec));
  }

  /**
   * Create and populate a notebook directory.
   */
  function createNotebookDir(): string {
    const nbDir = mktempDir('notebook');
    fs.mkdirSync(path.join(nbDir, 'src'));
    fs.writeFileSync(path.join(nbDir, 'src', 'temp.txt'), 'hello');

    const roFilepath = path.join(nbDir, 'src', 'readonly-temp.txt');
    fs.writeFileSync(roFilepath, 'hello from a ready only file', {
      mode: 0o444
    });
    return nbDir;
  }

  /**
   * Create a temporary directory for schemas.
   */
  function createAppDir(): string {
    const appDir = mktempDir('app');

    // Add a fake static/index.html for `ensure_app_check()`
    fs.mkdirSync(path.join(appDir, 'static'));
    fs.writeFileSync(path.join(appDir, 'static', 'index.html'), 'foo');

    // Add the apputils schema.
    const schemaDir = path.join(appDir, 'schemas');
    fs.mkdirSync(schemaDir, { recursive: true });
    const extensionDir = path.join(
      schemaDir,
      '@jupyterlab',
      'apputils-extension'
    );
    fs.mkdirSync(extensionDir, { recursive: true });

    // Get schema content.
    const schema = {
      title: 'Theme',
      description: 'Theme manager settings.',
      properties: {
        theme: {
          type: 'string',
          title: 'Selected Theme',
          default: 'JupyterLab Light'
        }
      },
      type: 'object'
    };
    fs.writeFileSync(
      path.join(extensionDir, 'themes.json'),
      JSON.stringify(schema)
    );
    return appDir;
  }

  /**
   * Handle configuration.
   */
  export function handleConfig(
    options: Partial<JupyterServer.IOptions>
  ): string {
    // Set up configuration.
    const token = UUID.uuid4();
    PageConfig.setOption('token', token);
    PageConfig.setOption('terminalsAvailable', 'true');

    if (options.pageConfig) {
      Object.keys(options.pageConfig).forEach(key => {
        PageConfig.setOption(key, options.pageConfig![key]);
      });
    }

    const configDir = mktempDir('config');
    const configPath = path.join(configDir, 'jupyter_server_config.json');
    const root_dir = createNotebookDir();

    const app_dir = createAppDir();
    const user_settings_dir = mktempDir('settings');
    const workspaces_dir = mktempDir('workspaces');

    const configData = merge(
      {
        LabApp: {
          user_settings_dir,
          workspaces_dir,
          app_dir,
          open_browser: false,
          log_level: 'DEBUG'
        },
        ServerApp: {
          token,
          root_dir,
          log_level: 'DEBUG'
        },
        MultiKernelManager: {
          default_kernel_name: 'echo'
        },
        KernelManager: {
          shutdown_wait_time: 1.0
        },
        LanguageServerManager: {
          autodetect: false
        }
      },
      options.configData || {}
    );
    PageConfig.setOption('__configData', JSON.stringify(configData));
    fs.writeFileSync(configPath, JSON.stringify(configData));
    return configDir;
  }

  /**
   * Handle data.
   */
  export function handleData(options: Partial<JupyterServer.IOptions>): string {
    const dataDir = mktempDir('data');

    // Install custom specs.
    installSpec(dataDir, 'echo', {
      argv: [
        'python',
        '-m',
        'jupyterlab.tests.echo_kernel',
        '-f',
        '{connection_file}'
      ],
      display_name: 'Echo Kernel',
      language: 'echo'
    });

    installSpec(dataDir, 'ipython', {
      argv: ['python', '-m', 'ipykernel_launcher', '-f', '{connection_file}'],
      display_name: 'Python 3',
      language: 'python'
    });

    if (options.additionalKernelSpecs) {
      Object.keys(options.additionalKernelSpecs).forEach(key => {
        installSpec(dataDir, key, options.additionalKernelSpecs![key]);
      });
    }
    return dataDir;
  }

  /**
   * Handle process startup.
   *
   * @param output the process output
   *
   * @returns The baseUrl of the server or `null`.
   */
  export function handleStartup(output: string): string | null {
    let baseUrl: string | null = null;
    output.split('\n').forEach(line => {
      const baseUrlMatch = line.match(/(http:\/\/localhost:\d+\/[^?]*)/);
      if (baseUrlMatch) {
        baseUrl = baseUrlMatch[1].replace('/lab', '');
        PageConfig.setOption('baseUrl', baseUrl);
      }
    });
    return baseUrl;
  }

  /**
   * Connect to the Jupyter server.
   */
  export async function connect(
    baseUrl: string,
    startDelegate: PromiseDelegate<string>
  ): Promise<void> {
    // eslint-disable-next-line
    while (true) {
      try {
        await fetch(URLExt.join(baseUrl, 'api'));
        startDelegate.resolve(baseUrl);
        return;
      } catch (e) {
        // spin until we can connect to the server.
        console.warn(e);
        await sleep(1000);
      }
    }
  }
}
