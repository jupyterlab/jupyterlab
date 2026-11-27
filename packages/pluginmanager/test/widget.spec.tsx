// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { JupyterLab } from '@jupyterlab/application';
import { ServerConnection } from '@jupyterlab/services';
import { framePromise } from '@jupyterlab/testing';
import { nullTranslator } from '@jupyterlab/translation';
import { MessageLoop } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import { act } from 'react-dom/test-utils';
import { PluginListModel, Plugins } from '../src';

describe('@jupyterlab/pluginmanager', () => {
  describe('Plugins', () => {
    let model: PluginListModel;
    let panel: Plugins;
    let makeRequestSpy: jest.SpyInstance;

    beforeEach(async () => {
      makeRequestSpy = jest
        .spyOn(ServerConnection, 'makeRequest')
        .mockImplementation(url => {
          const reply = url.includes('/lab/api/plugins')
            ? { allLocked: false, lockRules: [] }
            : { status: 'ok', needs_restart: [] };
          return Promise.resolve({
            ok: true,
            status: 200,
            text: () => Promise.resolve(JSON.stringify(reply))
          }) as unknown as Promise<Response>;
        });

      const availablePlugins: JupyterLab.IPluginInfo[] = [
        {
          id: 'plugin-a',
          description: 'Plugin A',
          autoStart: true,
          requires: [],
          optional: [],
          provides: null,
          enabled: true,
          extension: 'ext-a'
        },
        {
          id: 'plugin-b',
          description: 'Plugin B',
          autoStart: true,
          requires: [],
          optional: [],
          provides: null,
          enabled: false,
          extension: 'ext-b'
        },
        {
          id: 'plugin-c',
          description: 'Plugin C',
          autoStart: true,
          requires: [],
          optional: [],
          provides: null,
          enabled: true,
          extension: 'ext-c'
        }
      ];

      model = new PluginListModel({
        pluginData: { availablePlugins },
        serverSettings: ServerConnection.makeSettings(),
        translator: nullTranslator
      });
      await model.ready;
      model.isDisclaimed = true;

      panel = new Plugins({ model, translator: nullTranslator });
      await act(async () => {
        Widget.attach(panel, document.body);
        MessageLoop.flush();
        await (panel.widgets[2] as unknown as { renderPromise?: Promise<void> })
          .renderPromise;
        await framePromise();
      });
    });

    afterEach(() => {
      panel.dispose();
      model.dispose();
      makeRequestSpy.mockRestore();
    });

    it('should keep row order when toggling enabled checkbox while sorted by enabled', async () => {
      const enabledHeader = panel.node.querySelector<HTMLElement>(
        'th[data-id="enabled"]'
      );
      expect(enabledHeader).not.toBeNull();
      await act(async () => {
        enabledHeader!.click();
        await framePromise();
      });

      const getRowKeys = () =>
        Array.from(
          panel.node.querySelectorAll<HTMLTableRowElement>('tbody tr[data-key]')
        ).map(row => row.dataset.key);

      expect(getRowKeys()).toEqual(['plugin-b', 'plugin-a', 'plugin-c']);

      const firstCheckbox = panel.node.querySelector<HTMLInputElement>(
        'tbody tr[data-key="plugin-b"] input[type="checkbox"]'
      );
      expect(firstCheckbox).not.toBeNull();
      await act(async () => {
        firstCheckbox!.click();
        await Promise.resolve();
        MessageLoop.flush();
        await framePromise();
      });

      // Row stays in place while toggling checkboxes
      expect(getRowKeys()).toEqual(['plugin-b', 'plugin-a', 'plugin-c']);

      // Re-sorting by clicking header applies the updated enabled state
      await act(async () => {
        enabledHeader!.click();
        await framePromise();
      });
      expect(getRowKeys()).toEqual(['plugin-c', 'plugin-b', 'plugin-a']);
    });
  });
});
