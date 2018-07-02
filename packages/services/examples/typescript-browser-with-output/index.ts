/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2017, Jupyter Development Team.
|
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

// Polyfill for ES6 Promises
import 'es6-promise';

import { OutputArea, OutputAreaModel } from '@jupyterlab/outputarea';

import {
  RenderMimeRegistry,
  standardRendererFactories as initialFactories
} from '@jupyterlab/rendermime';

import { Kernel } from '@jupyterlab/services';

function main() {
  const code = [
    'import numpy as np',
    'import matplotlib.pyplot as plt',
    '%matplotlib inline',
    'x = np.linspace(-10,10)',
    'y = x**2',
    'print(x)',
    'print(y)',
    'plt.plot(x, y)'
  ].join('\n');
  const model = new OutputAreaModel();
  const rendermime = new RenderMimeRegistry({ initialFactories });
  const outputArea = new OutputArea({ model, rendermime });

  Kernel.startNew().then(kernel => {
    outputArea.future = kernel.requestExecute({ code });
    document.getElementById('outputarea').appendChild(outputArea.node);
  });
}

window.onload = main;
