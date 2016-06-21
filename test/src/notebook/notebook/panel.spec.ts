// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  INotebookModel, NotebookModel
} from '../../../../lib/notebook/notebook/model';

import {
  Notebook, StaticNotebook
} from '../../../../lib/notebook/notebook/widget';

import {
  nbformat
} from '../../../../lib/notebook/notebook/nbformat';

import {
  defaultRenderMime
} from '../../rendermime/rendermime.spec';


class LogNotebookPanel extends NotebookPanel {

  methods: string[] = [];

  protected onContextChanged(oldValue: IDocumentContext<INotebookModel>, newValue: IDocumentContext<INotebookModel>): void {
    super.onContextChanged(oldValue, newValue);
    this.methods.push('onContextChanged');
  }

  protected onModelStateChanged(sender: INotebookModel, args: IChangedArgs<any>): void {
    super.onModelStateChanged(sender, args);
    this.methods.push('onModelStateChanged');
  }

  protected onPathChanged(sender: IDocumentContext<INotebookModel>, path: string): void {
    super.onPathChanged(sender, args);
    this.methods.push('onPathChanged');
  }

  protected onContentStateChanged(sender: Notebook, args: IChangedArgs<any>): void {
    super.onContentStateChanged(sender, args);
    this.methods.push('onContentStateChanged');
  }

  protected onTextChanged(editor: CellEditorWidget, change: ITextChange): void {
    super.onTextChanged(editor, change);
    this.methods.push('onTextChanged');
  }

  protected onCompletionRequested(editor: CellEditorWidget, change: ICompletionRequest): void {
    super.onCompletionRequested(editor, change);
    this.methods.push('onCompletionRequested');
  }

  protected onCompletionSelected(widget: CompletionWidget, value: string): void {
    super.onCompletionSelected(widget, value);
    this.methods.push('onCompletionSelected');
  }
}


describe('notebook/notebook/panel', () => {

  describe('NotebookPanel', () => {

    describe('#constructor()', () => {

      it('should create a notebook panel', () => {

      });


      it('should accept an optional render', () => {

      });

    });

    describe('#contextChanged', () => {

    });

    describe('#kernelChanged', () => {

    });

    describe('#toolbar', () => {

    });

    describe('#content', () => {

    });

    describe('#kernel', () => {

    });

    describe('#rendermime', () => {

    });

    describe('#renderer', () => {

    });

    describe('#clipboard', () => {

    });

    describe('#model', () => {

    });

    describe('#context', () => {

    });

    describe('#dispose()', () => {

    });

    describe('#onContextChanged()', () => {

    });

    describe('#onKernelChanged()', () => {

    });

    describe('#onModelStateChanged()', () => {

    });

    describe('#onPathChanged()', () => {

    });

    describe('#onContentStateChanged()', () => {

    });

    describe('#onTextChanged()', () => {

    });

    describe('#onCompletionRequested()', () => {

    });

    describe('#onCompletionSelected()', () => {

    });

  });

});
