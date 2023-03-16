// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ToolbarButton } from '@jupyterlab/apputils';
import { Context } from '@jupyterlab/docregistry';
import { initNotebookContext } from '@jupyterlab/notebook/lib/testutils';
import { JupyterServer } from '@jupyterlab/testing';
import {
  INotebookModel,
  NotebookPanel,
  NotebookWidgetFactory
} from '@jupyterlab/notebook';
import * as utils from './utils';

const rendermime = utils.defaultRenderMime();

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

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
        const factory = utils.createNotebookWidgetFactory();
        expect(factory).toBeInstanceOf(NotebookWidgetFactory);
      });
    });

    describe('#isDisposed', () => {
      it('should get whether the factory has been disposed', () => {
        const factory = utils.createNotebookWidgetFactory();
        expect(factory.isDisposed).toBe(false);
        factory.dispose();
        expect(factory.isDisposed).toBe(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the factory', () => {
        const factory = utils.createNotebookWidgetFactory();
        factory.dispose();
        expect(factory.isDisposed).toBe(true);
      });

      it('should be safe to call multiple times', () => {
        const factory = utils.createNotebookWidgetFactory();
        factory.dispose();
        factory.dispose();
        expect(factory.isDisposed).toBe(true);
      });
    });

    describe('#editorConfig', () => {
      it('should be the editor config passed into the constructor', () => {
        const factory = utils.createNotebookWidgetFactory();
        expect(factory.editorConfig).toBe(utils.defaultEditorConfig);
      });

      it('should be settable', () => {
        const factory = utils.createNotebookWidgetFactory();
        const newConfig = { ...utils.defaultEditorConfig };
        factory.editorConfig = newConfig;
        expect(factory.editorConfig).toBe(newConfig);
      });
    });

    describe('#createNew()', () => {
      it('should create a new `NotebookPanel` widget', () => {
        const factory = utils.createNotebookWidgetFactory();
        const panel = factory.createNew(context);
        expect(panel).toBeInstanceOf(NotebookPanel);
      });

      it('should create a clone of the rendermime', () => {
        const factory = utils.createNotebookWidgetFactory();
        const panel = factory.createNew(context);
        expect(panel.content.rendermime).not.toBe(rendermime);
      });

      it('should pass the editor config to the notebook', () => {
        const factory = utils.createNotebookWidgetFactory();
        const panel = factory.createNew(context);
        expect(panel.content.editorConfig).toBe(utils.defaultEditorConfig);
      });

      it('should populate the default toolbar items', () => {
        const factory = utils.createNotebookWidgetFactory();
        const panel = factory.createNew(context);
        // It will only contain the popup opener
        expect(Array.from(panel.toolbar.names())).toHaveLength(1);
      });

      it('should populate the customized toolbar items', () => {
        const toolbarFactory = () => [
          { name: 'foo', widget: new ToolbarButton() },
          { name: 'bar', widget: new ToolbarButton() }
        ];
        const factory = utils.createNotebookWidgetFactory(toolbarFactory);
        const panel = factory.createNew(context);
        const panel2 = factory.createNew(context);
        expect(Array.from(panel.toolbar.names())).toEqual([
          'foo',
          'bar',
          'toolbar-popup-opener'
        ]);
        expect(Array.from(panel2.toolbar.names())).toEqual([
          'foo',
          'bar',
          'toolbar-popup-opener'
        ]);
        expect(Array.from(panel.toolbar.children()).length).toBe(3);
        expect(Array.from(panel2.toolbar.children()).length).toBe(3);
      });

      it('should clone from the optional source widget', () => {
        const factory = utils.createNotebookWidgetFactory();
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
