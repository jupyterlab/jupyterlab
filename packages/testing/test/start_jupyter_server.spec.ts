// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import { JupyterServer } from '@jupyterlab/testing';

describe('JupyterServer', () => {
  it('should start the server', async () => {
    const server = new JupyterServer();
    const url = await server.start();
    await fetch(URLExt.join(url, 'api'));
    await expect(server.shutdown()).resolves.not.toThrow();
  }, 30000);

  it('should accept options', async () => {
    const pageConfig = { foo: 'bar', fizz: 'buzz' };
    const configData = {
      // eslint-disable-next-line camelcase
      FakeTrait: { fake_prop: 1 },
      // eslint-disable-next-line camelcase
      OtherTrait: { other_prop: 'hello' },
      KernelManager: {
        // eslint-disable-next-line camelcase
        shutdown_wait_time: 1.11
      }
    };
    const additionalKernelSpecs = {
      foo: {
        argv: ['python', '-m', 'ipykernel_launcher', '-f', '{connection_file}'],
        display_name: 'Test Python',
        language: 'python'
      }
    };
    const server = new JupyterServer();
    const url = await server.start({
      pageConfig,
      configData,
      additionalKernelSpecs
    });
    await fetch(URLExt.join(url, 'api'));
    expect(PageConfig.getOption('foo')).toEqual('bar');
    expect(PageConfig.getOption('fizz')).toEqual('buzz');
    expect(PageConfig.getOption('__configData')).toContain('FakeTrait');
    expect(PageConfig.getOption('__configData')).toContain('OtherTrait');
    expect(PageConfig.getOption('__configData')).toContain('1.11');
    expect(PageConfig.getOption('__kernelSpec_foo')).toContain('Test Python');
    await expect(server.shutdown()).resolves.not.toThrow();
  }, 30000);
});
