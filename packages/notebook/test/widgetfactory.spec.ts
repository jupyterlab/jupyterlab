// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

import { toArray } from '@lumino/algorithm';

import { ToolbarButton } from '@jupyterlab/apputils';

import { DocumentRegistry, Context } from '@jupyterlab/docregistry';

import { INotebookModel, NotebookPanel, NotebookWidgetFactory } from '../src';

import { initNotebookContext } from '@jupyterlab/testutils';
import { JupyterServer } from '@jupyterlab/testutils/lib/start_jupyter_server';
import * as utils from './utils';

const contentFactory = utils.createNotebookPanelFactory();
const rendermime = utils.defaultRenderMime();

const server = new JupyterServer();

beforeAll(async () => {
  jest.setTimeout(20000);
  await server.start();
});

afterAll(async () => {
  await server.shutdown();
});

function createFactory(
  toolbarFactory?: (widget: NotebookPanel) => DocumentRegistry.IToolbarItem[]
): NotebookWidgetFactory {
  return new NotebookWidgetFactory({
    name: 'notebook',
    fileTypes: ['notebook'],
    rendermime,
    toolbarFactory,
    contentFactory,
    mimeTypeService: utils.mimeTypeService,
    editorConfig: utils.defaultEditorConfig
  });
}

describe('@jupyterlab/notebook', () => {
  describe('NotebookWidgetFactory', () => {
    let context: Context<INotebookModel>;

    beforeEach(async () => {
      context = await initNotebookContext();
    });

    afterEach(() => {
      context.dispose();
    });

    describe('#constructor()', () => {
      it('should create a notebook widget factory', () => {
        const factory = createFactory();
        expect(factory).toBeInstanceOf(NotebookWidgetFactory);
      });
    });

    describe('#isDisposed', () => {
      it('should get whether the factory has been disposed', () => {
        const factory = createFactory();
        expect(factory.isDisposed).toBe(false);
        factory.dispose();
        expect(factory.isDisposed).toBe(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the factory', () => {
        const factory = createFactory();
        factory.dispose();
        expect(factory.isDisposed).toBe(true);
      });

      it('should be safe to call multiple times', () => {
        const factory = createFactory();
        factory.dispose();
        factory.dispose();
        expect(factory.isDisposed).toBe(true);
      });
    });

    describe('#editorConfig', () => {
      it('should be the editor config passed into the constructor', () => {
        const factory = createFactory();
        expect(factory.editorConfig).toBe(utils.defaultEditorConfig);
      });

      it('should be settable', () => {
        const factory = createFactory();
        const newConfig = { ...utils.defaultEditorConfig };
        factory.editorConfig = newConfig;
        expect(factory.editorConfig).toBe(newConfig);
      });
    });

    describe('#createNew()', () => {
      it('should create a new `NotebookPanel` widget', () => {
        const factory = createFactory();
        const panel = factory.createNew(context);
        expect(panel).toBeInstanceOf(NotebookPanel);
      });

      it('should create a clone of the rendermime', () => {
        const factory = createFactory();
        const panel = factory.createNew(context);
        expect(panel.content.rendermime).not.toBe(rendermime);
      });

      it('should pass the editor config to the notebook', () => {
        const factory = createFactory();
        const panel = factory.createNew(context);
        expect(panel.content.editorConfig).toBe(utils.defaultEditorConfig);
      });

      it('should populate the default toolbar items', () => {
        const factory = createFactory();
        const panel = factory.createNew(context);
        const items = toArray(panel.toolbar.names());
        expect(items).toEqual(expect.arrayContaining(['save']));
        expect(items).toEqual(expect.arrayContaining(['restart']));
        expect(items).toEqual(expect.arrayContaining(['kernelStatus']));
      });

      it('should populate the customized toolbar items', () => {
        const toolbarFactory = () => [
          { name: 'foo', widget: new ToolbarButton() },
          { name: 'bar', widget: new ToolbarButton() }
        ];
        const factory = createFactory(toolbarFactory);
        const panel = factory.createNew(context);
        const panel2 = factory.createNew(context);
        expect(toArray(panel.toolbar.names())).toEqual(['foo', 'bar']);
        expect(toArray(panel2.toolbar.names())).toEqual(['foo', 'bar']);
        expect(toArray(panel.toolbar.children()).length).toBe(2);
        expect(toArray(panel2.toolbar.children()).length).toBe(2);
      });

      it('should clone from the optional source widget', () => {
        const factory = createFactory();
        const panel = factory.createNew(context);
        const clone = factory.createNew(panel.context, panel);
        expect(clone).toBeInstanceOf(NotebookPanel);
        expect(clone.content.rendermime).toBe(panel.content.rendermime);
        expect(clone.content.editorConfig).toBe(panel.content.editorConfig);
        expect(clone.content.notebookConfig).toBe(panel.content.notebookConfig);
      });
    });
  });
});
