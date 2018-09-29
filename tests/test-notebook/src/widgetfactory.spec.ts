// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { toArray } from '@phosphor/algorithm';

import { INotebookModel } from '@jupyterlab/notebook';

import { NotebookPanel } from '@jupyterlab/notebook';

import { NotebookWidgetFactory } from '@jupyterlab/notebook';

import { DocumentRegistry, Context } from '@jupyterlab/docregistry';

import { createNotebookContext, NBTestUtils } from '@jupyterlab/testutils';

import { ToolbarButton } from '@jupyterlab/apputils';

const contentFactory = NBTestUtils.createNotebookPanelFactory();
const rendermime = NBTestUtils.defaultRenderMime();

function createFactory(
  toolbarFactory?: (widget: NotebookPanel) => DocumentRegistry.IToolbarItem[]
): NotebookWidgetFactory {
  return new NotebookWidgetFactory({
    name: 'notebook',
    fileTypes: ['notebook'],
    rendermime,
    toolbarFactory,
    contentFactory,
    mimeTypeService: NBTestUtils.mimeTypeService,
    editorConfig: NBTestUtils.defaultEditorConfig
  });
}

describe('@jupyterlab/notebook', () => {
  describe('NotebookWidgetFactory', () => {
    let context: Context<INotebookModel>;

    beforeEach(async () => {
      context = await createNotebookContext();
    });

    afterEach(async () => {
      await context.session.shutdown();
      context.dispose();
    });

    describe('#constructor()', () => {
      it('should create a notebook widget factory', () => {
        const factory = createFactory();
        expect(factory).to.be.an.instanceof(NotebookWidgetFactory);
      });
    });

    describe('#isDisposed', () => {
      it('should get whether the factory has been disposed', () => {
        const factory = createFactory();
        expect(factory.isDisposed).to.equal(false);
        factory.dispose();
        expect(factory.isDisposed).to.equal(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the factory', () => {
        const factory = createFactory();
        factory.dispose();
        expect(factory.isDisposed).to.equal(true);
      });

      it('should be safe to call multiple times', () => {
        const factory = createFactory();
        factory.dispose();
        factory.dispose();
        expect(factory.isDisposed).to.equal(true);
      });
    });

    describe('#editorConfig', () => {
      it('should be the editor config passed into the constructor', () => {
        const factory = createFactory();
        expect(factory.editorConfig).to.equal(NBTestUtils.defaultEditorConfig);
      });

      it('should be settable', () => {
        const factory = createFactory();
        const newConfig = { ...NBTestUtils.defaultEditorConfig };
        factory.editorConfig = newConfig;
        expect(factory.editorConfig).to.equal(newConfig);
      });
    });

    describe('#createNew()', () => {
      it('should create a new `NotebookPanel` widget', () => {
        const factory = createFactory();
        const panel = factory.createNew(context);
        expect(panel).to.be.an.instanceof(NotebookPanel);
      });

      it('should create a clone of the rendermime', () => {
        const factory = createFactory();
        const panel = factory.createNew(context);
        expect(panel.rendermime).to.not.equal(rendermime);
      });

      it('should pass the editor config to the notebook', () => {
        const factory = createFactory();
        const panel = factory.createNew(context);
        expect(panel.content.editorConfig).to.equal(
          NBTestUtils.defaultEditorConfig
        );
      });

      it('should populate the default toolbar items', () => {
        const factory = createFactory();
        const panel = factory.createNew(context);
        const items = toArray(panel.toolbar.names());
        expect(items).to.contain('save');
        expect(items).to.contain('restart');
        expect(items).to.contain('kernelStatus');
      });

      it('should populate the customized toolbar items', () => {
        const toolbarFactory = () => [
          { name: 'foo', widget: new ToolbarButton() },
          { name: 'bar', widget: new ToolbarButton() }
        ];
        const factory = createFactory(toolbarFactory);
        const panel = factory.createNew(context);
        const panel2 = factory.createNew(context);
        expect(toArray(panel.toolbar.names())).to.deep.equal(['foo', 'bar']);
        expect(toArray(panel2.toolbar.names())).to.deep.equal(['foo', 'bar']);
        expect(toArray(panel.toolbar.children()).length).to.equal(2);
        expect(toArray(panel2.toolbar.children()).length).to.equal(2);
      });
    });
  });
});
