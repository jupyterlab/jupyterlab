/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, Jupyter Development Team.
|
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

// Polyfill for ES6 Promises
import 'es6-promise';

import { OutputArea, OutputAreaModel } from '@jupyterlab/outputarea';

import { 
  RenderMime, defaultRendererFactories
} from '@jupyterlab/rendermime';

import {
  Kernel, ServerConnection, Session
} from '@jupyterlab/services';

function main() {
  let settings: ServerConnection.ISettings
  let sessionOptions: Session.IOptions
  let session: Session.ISession;
  let kernel: Kernel.IKernel


  let renderMimeOptions: RenderMime.IOptions
  let renderMime: RenderMime
  let model: OutputAreaModel
  let outputAreaOptions: OutputArea.IOptions
  let outputArea: OutputArea

  let promise: Promise<Kernel.IFuture>
  let future: Kernel.IFuture

  let testcode = [
    'import numpy as np',
    'import matplotlib.pyplot as plt',
    '%matplotlib inline',
    'x = np.linspace(-10,10)',
    'y = x**2',
    'print(x)',
    'print(y)',
    'plt.plot(x, y)'
  ].join('\n')

  settings = ServerConnection.makeSettings({})
  sessionOptions = {
    kernelName: 'python3',
    serverSettings: settings
  };

  model = new OutputAreaModel()
  renderMime = new RenderMime()
    
  for (let factory of defaultRendererFactories) {
    renderMime.addFactory(factory)
  }

  outputAreaOptions = {
    model: model,
    rendermime: renderMime
  }

  outputArea = new OutputArea(outputAreaOptions)
    
  Kernel.startNew(this.options).then(newKernel => {
    kernel = newKernel
  }).then(() => {
    future = kernel.requestExecute({ code: testcode })
  }).then(() => {
    outputArea.future = future
    return future.done
  }).then(() => {
    document.getElementById("outputarea").appendChild(this.outputArea.node)
  })
}

window.onload = main;
