/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module example-services-outputarea
 */

import { PageConfig, URLExt } from '@jupyterlab/coreutils';
(window as any).__webpack_public_path__ = URLExt.join(
  PageConfig.getBaseUrl(),
  'example/'
);

// This has to be done after webpack public path is set to load the
// fonts.
import '../style/index.css';

import { OutputArea, OutputAreaModel } from '@jupyterlab/outputarea';

import {
  standardRendererFactories as initialFactories,
  RenderMimeRegistry
} from '@jupyterlab/rendermime';

import { KernelManager } from '@jupyterlab/services';

async function main() {
  const code = [
    'from IPython.display import HTML',
    'HTML("<h1>Hello, world!</h1>")'
  ].join('\n');
  const model = new OutputAreaModel();
  const rendermime = new RenderMimeRegistry({ initialFactories });
  const outputArea = new OutputArea({ model, rendermime });

  const kernelManager = new KernelManager();
  const kernel = await kernelManager.startNew();
  outputArea.future = kernel.requestExecute({ code });
  document.getElementById('outputarea')?.appendChild(outputArea.node);
  await outputArea.future.done;
  console.debug('Test complete!');
}

window.onload = main;
