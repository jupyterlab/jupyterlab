// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Sanitizer } from '@jupyterlab/apputils';
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
  // Render textual outputs synchronously in tests so that assertions can observe
  // the fully-rendered output without having to drive the incremental
  // (animation-frame based) rendering pipeline. That pipeline is covered by
  // rendermime's own tests (renderers.spec.ts, factories.spec.ts).
  const sanitizer = new Sanitizer();
  sanitizer.setIncrementalAutolink(false);
  export const rendermime = new RenderMimeRegistry({
    initialFactories: standardRendererFactories,
    sanitizer
  });
}
