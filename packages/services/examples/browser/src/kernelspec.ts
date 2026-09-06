// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { KernelSpecManager } from '@jupyterlab/services';

import { log } from './log';

export async function main(): Promise<void> {
  log('Get the list of kernel specs');
  const kernelSpecManager = new KernelSpecManager();
  await kernelSpecManager.ready;
  const kernelSpecs = kernelSpecManager.specs;
  log(`Default spec: ${kernelSpecs?.default}`);
  log(`Available specs: ${Object.keys(kernelSpecs?.kernelspecs ?? {})}`);
}
