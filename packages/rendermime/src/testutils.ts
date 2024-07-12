// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IOutput } from '@jupyterlab/nbformat';
import { standardRendererFactories } from './factories';
import { RenderMimeRegistry } from './registry';

/**
 * The default outputs used for testing.
 */
export const DEFAULT_OUTPUTS: IOutput[] = [
  {
    name: 'stdout',
    output_type: 'stream',
    text: ['hello world\n', '0\n', '1\n', '2\n']
  },
  {
    name: 'stderr',
    output_type: 'stream',
    text: ['output to stderr\n']
  },
  {
    name: 'stderr',
    output_type: 'stream',
    text: ['output to stderr2\n']
  },
  {
    output_type: 'execute_result',
    execution_count: 1,
    data: { 'text/plain': 'foo' },
    metadata: {}
  },
  {
    output_type: 'display_data',
    data: { 'text/plain': 'hello, world' },
    metadata: {}
  },
  {
    output_type: 'error',
    ename: 'foo',
    evalue: 'bar',
    traceback: ['fizz', 'buzz']
  }
];

/**
 * Get a copy of the default rendermime instance.
 */
export function defaultRenderMime(): RenderMimeRegistry {
  return Private.rendermime.clone();
}

/**
 * A namespace for private data.
 */
namespace Private {
  export const rendermime = new RenderMimeRegistry({
    initialFactories: standardRendererFactories
  });
}
