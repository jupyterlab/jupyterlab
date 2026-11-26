// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// The extension entries mirror the snake_case JSON returned by the server.
/* eslint-disable camelcase */

import { PageConfig } from '@jupyterlab/coreutils';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { framePromise } from '@jupyterlab/testing';
import { nullTranslator } from '@jupyterlab/translation';
import { ExtensionsPanel, ListModel } from '@jupyterlab/extensionmanager';
import type { IEntry } from '@jupyterlab/extensionmanager';
import { Widget } from '@lumino/widgets';

const INSTALLED: IEntry[] = [
  {
    name: 'jupyterlab-git',
    description: 'A JupyterLab extension for version control using git',
    homepage_url: 'https://github.com/jupyterlab/jupyterlab-git',
    installed: true,
    allowed: true,
    approved: false,
    enabled: true,
    latest_version: '1.0.0',
    installed_version: '1.0.0',
    status: 'ok',
    pkg_type: 'prebuilt'
  },
  {
    name: 'jupyterlab-language-pack-fr-FR',
    description: 'JupyterLab French (France) Language Pack',
    homepage_url: 'https://github.com/jupyterlab/language-packs',
    installed: true,
    allowed: true,
    approved: false,
    enabled: false,
    latest_version: null,
    installed_version: '4.5.post3',
    status: 'ok',
    pkg_type: 'language-pack'
  }
];

class TestModel extends ListModel {
  protected async fetchInstalled(): Promise<IEntry[]> {
    return INSTALLED;
  }
}

class SearchModel extends TestModel {
  results: IEntry[] = [];

  get searchResult(): ReadonlyArray<IEntry> {
    return this.results;
  }

  protected async search(): Promise<void> {
    this.stateChanged.emit();
  }
}

describe('@jupyterlab/extensionmanager', () => {
  describe('ExtensionsPanel', () => {
    let model: TestModel;
    let panel: ExtensionsPanel;

    beforeEach(() => {
      PageConfig.setOption('extensionManager', '{}');
      model = new TestModel(new ServiceManagerMock());
      panel = new ExtensionsPanel({ model, translator: nullTranslator });
      Widget.attach(panel, document.body);
    });

    afterEach(() => {
      panel.dispose();
      model.dispose();
    });

    /**
     * Render the installed list for a query and return its content.
     */
    async function installedFor(query: string): Promise<string> {
      model.query = query;
      await model.refreshInstalled();
      const installed = panel.node.querySelector(
        '#jp-extensionmanager-installed'
      )!;
      for (
        let i = 0;
        i < 10 &&
        !installed.querySelector('.jp-extensionmanager-listview-wrapper');
        i++
      ) {
        await framePromise();
      }
      return installed.textContent ?? '';
    }

    it('should match installed extensions by plain text', async () => {
      const content = await installedFor('c++');
      expect(content).toContain('No entries');
    });

    it('should match installed language packs by description', async () => {
      const content = await installedFor('french');
      expect(content).toContain('jupyterlab-language-pack-fr-FR');
      expect(content).not.toContain('jupyterlab-git');
    });

    it('should link to the PyPI search whether or not it finds packages', async () => {
      PageConfig.setOption(
        'extensionManager',
        JSON.stringify({ name: 'PyPI', can_install: true })
      );
      const pypiModel = new SearchModel(new ServiceManagerMock());
      pypiModel.isDisclaimed = true;
      const pypiPanel = new ExtensionsPanel({
        model: pypiModel,
        translator: nullTranslator
      });
      Widget.attach(pypiPanel, document.body);
      const search = pypiPanel.node.querySelector(
        '#jp-extensionmanager-search'
      )!;
      const browseHref = () =>
        search
          .querySelector('.jp-extensionmanager-browse a')
          ?.getAttribute('href');
      const listed = () =>
        search.querySelector('.jp-extensionmanager-listview') !== null;

      pypiModel.query = 'no-such-extension';
      pypiModel.stateChanged.emit();
      for (
        let i = 0;
        i < 10 && !browseHref()?.includes('q=no-such-extension');
        i++
      ) {
        await framePromise();
      }
      const resultsShownWhenEmpty = listed();
      const linkWhenEmpty = browseHref();

      const found = { ...INSTALLED[0], installed: false };
      pypiModel.query = found.name;
      pypiModel.results = [found];
      pypiModel.stateChanged.emit();
      for (let i = 0; i < 10 && !listed(); i++) {
        await framePromise();
      }
      const resultsShownWhenFound = listed();
      const linkWhenFound = browseHref();
      pypiPanel.dispose();
      pypiModel.dispose();

      expect(resultsShownWhenEmpty).toBe(false);
      expect(linkWhenEmpty).toContain('q=no-such-extension');
      expect(resultsShownWhenFound).toBe(true);
      expect(linkWhenFound).toContain(`q=${found.name}`);
    });
  });
});
