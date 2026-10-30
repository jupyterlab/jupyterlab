// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { act } from 'react-dom/test-utils';

import { signalToPromise } from '@jupyterlab/testing';

import { MessageLoop } from '@lumino/messaging';

import { Widget } from '@lumino/widgets';

import { KernelSourcesBody } from '../src/panels/kernelSources/body';

import { KernelSourcesModel } from '../src/panels/kernelSources/model';

import type { IDebugger } from '../src/tokens';

describe('KernelSourcesBody', () => {
  let model: KernelSourcesModel;
  let body: KernelSourcesBody;

  beforeEach(async () => {
    model = new KernelSourcesModel();
    const service = {
      getSource: async (source: IDebugger.Source) => ({
        ...source,
        content: ''
      })
    } as unknown as IDebugger;
    body = new KernelSourcesBody({ model, service });
    await act(async () => {
      Widget.attach(body, document.body);
      MessageLoop.sendMessage(body, Widget.Msg.UpdateRequest);
    });
  });

  afterEach(() => {
    body.dispose();
    model.dispose();
  });

  const setSources = async (sources: IDebugger.KernelSource[]) => {
    await act(async () => {
      model.kernelSources = sources;
    });
  };

  const getItem = (label: string): HTMLElement => {
    const items = body.node.querySelectorAll<HTMLElement>(
      '.jp-DebuggerKernelSource-item'
    );
    const item = Array.from(items).find(item => item.textContent === label);
    expect(item).toBeDefined();
    return item!;
  };

  const getSourceItem = (path: string): HTMLElement | null => {
    return body.node.querySelector<HTMLElement>(
      `.jp-DebuggerKernelSource-source[title="${path}"]`
    );
  };

  const click = async (element: HTMLElement) => {
    await act(async () => {
      element.click();
    });
  };

  it('should open the source of a package that has submodules', async () => {
    await setSources([
      { name: 'json', path: '/lib/json/__init__.py' },
      { name: 'json.decoder', path: '/lib/json/decoder.py' }
    ]);

    await click(getItem('json'));
    const packageSource = getSourceItem('/lib/json/__init__.py');
    expect(packageSource).not.toBeNull();
    expect(getSourceItem('/lib/json/decoder.py')?.textContent).toBe('decoder');

    const opened = signalToPromise(model.kernelSourceOpened);
    await click(packageSource!);
    const [, source] = await opened;
    expect(source?.path).toBe('/lib/json/__init__.py');
  });

  it('should stop merging nested packages at a package source', async () => {
    await setSources([
      { name: 'google.protobuf', path: '/lib/google/protobuf/__init__.py' },
      {
        name: 'google.protobuf.message',
        path: '/lib/google/protobuf/message.py'
      }
    ]);

    await click(getItem('google'));
    expect(getItem('google.protobuf')).toBeDefined();
    expect(getSourceItem('/lib/google/protobuf/__init__.py')).not.toBeNull();
    expect(getSourceItem('/lib/google/protobuf/message.py')).not.toBeNull();
  });

  it('should show the sources that match the filter', async () => {
    model.filter = 'decoder';
    await setSources([
      { name: 'json', path: '/lib/json/__init__.py' },
      { name: 'json.decoder', path: '/lib/json/decoder.py' }
    ]);

    expect(getSourceItem('/lib/json/decoder.py')).not.toBeNull();
  });

  it('should not split a file name on the dot of its extension', async () => {
    await setSources([{ name: 'module.cpp', path: '/src/module.cpp' }]);

    expect(getSourceItem('/src/module.cpp')?.textContent).toBe('module.cpp');
  });
});
