// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

const fetch = require('node-fetch');

import { JupyterServer } from '../src';
import { PageConfig, URLExt } from '@jupyterlab/coreutils';

describe('JupyterServer', () => {
  it('should start the server', async () => {
    jest.setTimeout(20000);
    const server = new JupyterServer();
    const url = await server.start();
    await fetch(URLExt.join(url, 'api'));
    await expect(server.shutdown()).resolves.not.toThrow();
  });

  it('should accept options', async () => {
    jest.setTimeout(20000);
    const pageConfig = { foo: 'bar', fizz: 'buzz' };
    const configData = {
      FakeTrait: { fake_prop: 1 },
      OtherTrait: { other_prop: 'hello' },
      KernelManager: {
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
  });
});
