// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module example-services-browser
 */

import { PageConfig, URLExt } from '@jupyterlab/coreutils';
(window as any).__webpack_public_path__ = URLExt.join(
  PageConfig.getBaseUrl(),
  'example/'
);

import * as comm from './comm';
import * as config from './config';
import * as contents from './contents';
import * as kernel from './kernel';
import * as kernelspec from './kernelspec';
import * as session from './session';
import * as terminal from './terminal';

import { log } from './log';

async function main() {
  try {
    log('Starting tests');

    log('Executing kernel spec example');
    await kernelspec.main();
    log('kernel spec example complete!');

    log('Executing kernel example');
    await kernel.main();
    log('kernel example complete!');

    log('Executing comm example');
    await comm.main();
    log('comm example complete!');

    log('Executing session example');
    await session.main();
    log('session example complete!');

    log('Executing contents example');
    await contents.main();
    log('contents example complete!');

    log('Executing config example');
    await config.main();
    log('config example complete!');

    log('Executing terminal example');
    await terminal.main();
    log('terminal example complete!');

    log('Test Complete!');
  } catch (err) {
    console.error(err);
    log('Test Failed! See the console output for details');
    throw err;
  }
}

window.onload = main;
