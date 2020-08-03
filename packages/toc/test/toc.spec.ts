// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

import {
  NotebookPanel,
  NotebookTracker,
  NotebookWidgetFactory,
  NotebookModelFactory
} from '@jupyterlab/notebook';
import { DocumentManager } from '@jupyterlab/docmanager';
import * as ToC from '@jupyterlab/toc';
import { RenderMimeRegistry } from '@jupyterlab/rendermime';
import { ServiceManager } from '@jupyterlab/services';
import { DocumentRegistry, TextModelFactory } from '@jupyterlab/docregistry';
import { UUID } from '@lumino/coreutils';

import { NBTestUtils, Mock, defaultRenderMime } from '@jupyterlab/testutils';

let manager: DocumentManager;
let widget: ToC.TableOfContents;
let registry: DocumentRegistry;
let services: ServiceManager.IManager;
let factory: TextModelFactory;

beforeAll(async () => {
  jest.setTimeout(20000);
  const opener: DocumentManager.IWidgetOpener = {
    open: widget => {
      // no-op
    }
  };
  factory = new TextModelFactory();
  registry = new DocumentRegistry({
    textModelFactory: factory
  });
  const contentFactory = NBTestUtils.createNotebookPanelFactory();
  const notebookFactory = new NotebookModelFactory({});
  registry.addModelFactory(notebookFactory);
  registry.addWidgetFactory(
    new NotebookWidgetFactory({
      modelName: 'notebook',
      contentFactory,
      fileTypes: ['notebook'],
      rendermime: defaultRenderMime(),
      mimeTypeService: NBTestUtils.mimeTypeService,
      name: 'notebook'
    })
  );
  services = new Mock.ServiceManagerMock();
  manager = new DocumentManager({
    registry,
    opener,
    manager: services
  });
});

describe('@jupyterlab/toc', () => {
  describe('TableOfContents', () => {
    describe('#constructor', () => {
      it('should construct a new ToC widget', () => {
        widget = new ToC.TableOfContents({
          docmanager: manager,
          rendermime: new RenderMimeRegistry()
        });
        expect(widget).toBeInstanceOf(ToC.TableOfContents);
      });
    });
  });

  describe('TableOfContentsRegistry', () => {
    let registry: ToC.TableOfContentsRegistry;

    beforeAll(() => {
      registry = new ToC.TableOfContentsRegistry();
    });

    describe('IGenerator<NotebookPanel>', () => {
      let notebookTracker: NotebookTracker;
      let notebookGenerator: ToC.TableOfContentsRegistry.IGenerator<NotebookPanel>;
      let notebookWidget: NotebookPanel;

      it('should create a notebook generator', () => {
        notebookTracker = new NotebookTracker({
          namespace: 'notebook'
        });
        notebookGenerator = ToC.createNotebookGenerator(
          notebookTracker,
          widget,
          NBTestUtils.defaultRenderMime().sanitizer
        );
      });

      it('should add a notebook generator to the registry', () => {
        registry.add(notebookGenerator);
      });

      it('should find the notebook generator', async () => {
        const path = UUID.uuid4() + '.ipynb';
        const newNotebookWidget = manager.createNew(path, 'notebook');
        expect(newNotebookWidget).toBeInstanceOf(NotebookPanel);
        notebookWidget = newNotebookWidget as NotebookPanel;
        await notebookTracker.add(notebookWidget);
        const foundNotebookGenerator = registry.find(notebookWidget);
        expect(foundNotebookGenerator).toBeDefined();
      });

      it('should change current', async () => {
        widget.current = {
          widget: notebookWidget,
          generator: notebookGenerator
        };
      });
    });
  });
});
