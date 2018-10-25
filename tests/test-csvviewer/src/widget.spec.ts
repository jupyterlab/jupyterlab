// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { UUID } from '@phosphor/coreutils';

import { ServiceManager } from '@jupyterlab/services';

import { CSVViewer } from '@jupyterlab/csvviewer';

import {
  Context,
  DocumentRegistry,
  TextModelFactory
} from '@jupyterlab/docregistry';

function createContext(): Context<DocumentRegistry.IModel> {
  const factory = new TextModelFactory();
  const manager = new ServiceManager();
  const path = UUID.uuid4() + '.csv';
  return new Context({ factory, manager, path });
}

describe('csvviewer/widget', () => {
  const context = createContext();

  describe('CSVViewer', () => {
    describe('#constructor()', () => {
      it('should instantiate a `CSVViewer`', () => {
        const widget = new CSVViewer({ context });
        expect(widget).to.be.an.instanceof(CSVViewer);
        widget.dispose();
      });
    });

    describe('#context', () => {
      it('should be the context for the file', () => {
        const widget = new CSVViewer({ context });
        expect(widget.context).to.equal(context);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources held by the widget', () => {
        const widget = new CSVViewer({ context });
        expect(widget.isDisposed).to.equal(false);
        widget.dispose();
        expect(widget.isDisposed).to.equal(true);
      });

      it('should be safe to call multiple times', () => {
        const widget = new CSVViewer({ context });
        expect(widget.isDisposed).to.equal(false);
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.equal(true);
      });
    });
  });
});
