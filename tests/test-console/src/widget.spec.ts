// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { Message, MessageLoop } from '@lumino/messaging';

import { Widget } from '@lumino/widgets';

import { SessionContext } from '@jupyterlab/apputils';

import { CodeConsole } from '@jupyterlab/console';

import {
  CodeCell,
  CodeCellModel,
  RawCellModel,
  RawCell
} from '@jupyterlab/cells';

import { createSessionContext, NBTestUtils } from '@jupyterlab/testutils';

import {
  createConsoleFactory,
  rendermime,
  mimeTypeService,
  editorFactory
} from './utils';

class TestConsole extends CodeConsole {
  methods: string[] = [];

  protected newPromptCell(): void {
    this.methods.push('newPromptCell');
    super.newPromptCell();
  }

  protected onActivateRequest(msg: Message): void {
    this.methods.push('onActivateRequest');
    super.onActivateRequest(msg);
  }

  protected onAfterAttach(msg: Message): void {
    this.methods.push('onAfterAttach');
    super.onAfterAttach(msg);
  }

  protected onUpdateRequest(msg: Message): void {
    this.methods.push('onUpdateRequest');
    super.onUpdateRequest(msg);
  }
}

const contentFactory = createConsoleFactory();

describe('console/widget', () => {
  describe('CodeConsole', () => {
    let widget: TestConsole;

    beforeEach(async () => {
      const sessionContext = await createSessionContext();
      widget = new TestConsole({
        contentFactory,
        rendermime,
        sessionContext,
        mimeTypeService
      });
    });

    afterEach(async () => {
      await widget.sessionContext.shutdown();
      widget.sessionContext.dispose();
      widget.dispose();
    });

    describe('#constructor()', () => {
      it('should create a new console content widget', () => {
        Widget.attach(widget, document.body);
        expect(widget).to.be.an.instanceof(CodeConsole);
        expect(Array.from(widget.node.classList)).to.contain('jp-CodeConsole');
      });
    });

    describe('#cells', () => {
      it('should exist upon instantiation', () => {
        expect(widget.cells).to.be.ok;
      });

      it('should reflect the contents of the widget', async () => {
        const force = true;
        Widget.attach(widget, document.body);
        await (widget.sessionContext as SessionContext).initialize();
        await widget.execute(force);
        expect(widget.cells.length).to.equal(1);
        widget.clear();
        expect(widget.cells.length).to.equal(0);
      });
    });

    describe('#executed', () => {
      it('should emit a date upon execution', async () => {
        let called: Date | null = null;
        const force = true;
        Widget.attach(widget, document.body);
        widget.executed.connect((sender, time) => {
          called = time;
        });
        await (widget.sessionContext as SessionContext).initialize();
        await widget.execute(force);
        expect(called).to.be.an.instanceof(Date);
      });
    });

    describe('#promptCell', () => {
      it('should be a code cell widget', () => {
        Widget.attach(widget, document.body);
        expect(widget.promptCell).to.be.an.instanceof(CodeCell);
      });

      it('should be replaced after execution', async () => {
        const force = true;
        Widget.attach(widget, document.body);

        const old = widget.promptCell;
        expect(old).to.be.an.instanceof(CodeCell);

        await (widget.sessionContext as SessionContext).initialize();
        await widget.execute(force);
        expect(widget.promptCell).to.be.an.instanceof(CodeCell);
        expect(widget.promptCell).to.not.equal(old);
      });
    });

    describe('#session', () => {
      it('should be a client session object', () => {
        expect(widget.sessionContext.sessionChanged).to.be.ok;
      });
    });

    describe('#contentFactory', () => {
      it('should be the content factory used by the widget', () => {
        expect(widget.contentFactory).to.be.an.instanceof(
          CodeConsole.ContentFactory
        );
      });
    });

    describe('#addCell()', () => {
      it('should add a code cell to the content widget', () => {
        const contentFactory = NBTestUtils.createCodeCellFactory();
        const model = new CodeCellModel({});
        const cell = new CodeCell({
          model,
          contentFactory,
          rendermime
        }).initializeState();
        Widget.attach(widget, document.body);
        expect(widget.cells.length).to.equal(0);
        widget.addCell(cell);
        expect(widget.cells.length).to.equal(1);
      });
    });

    describe('#clear()', () => {
      it('should clear all of the content cells except the banner', async () => {
        const force = true;
        Widget.attach(widget, document.body);
        await (widget.sessionContext as SessionContext).initialize();
        await widget.execute(force);
        expect(widget.cells.length).to.be.greaterThan(0);
        widget.clear();
        expect(widget.cells.length).to.equal(0);
        expect(widget.promptCell!.model.value.text).to.equal('');
      });
    });

    describe('#dispose()', () => {
      it('should dispose the content widget', () => {
        Widget.attach(widget, document.body);
        expect(widget.isDisposed).to.equal(false);
        widget.dispose();
        expect(widget.isDisposed).to.equal(true);
      });

      it('should be safe to dispose multiple times', () => {
        Widget.attach(widget, document.body);
        expect(widget.isDisposed).to.equal(false);
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.equal(true);
      });
    });

    describe('#execute()', () => {
      it('should execute contents of the prompt if forced', async () => {
        const force = true;
        Widget.attach(widget, document.body);
        expect(widget.cells.length).to.equal(0);
        await (widget.sessionContext as SessionContext).initialize();
        await widget.execute(force);
        expect(widget.cells.length).to.be.greaterThan(0);
      });

      it('should check if code is multiline and allow amending', async () => {
        const force = false;
        const timeout = 9000;
        Widget.attach(widget, document.body);
        widget.promptCell!.model.value.text = 'for x in range(5):';
        expect(widget.cells.length).to.equal(0);
        const session = widget.sessionContext as SessionContext;
        session.kernelPreference = { name: 'ipython' };
        await session.initialize();
        await widget.execute(force, timeout);
        expect(widget.cells.length).to.equal(0);
      });
    });

    describe('#inject()', () => {
      it('should add a code cell and execute it', async () => {
        const code = 'print("#inject()")';
        Widget.attach(widget, document.body);
        expect(widget.cells.length).to.equal(0);
        await widget.inject(code);
        expect(widget.cells.length).to.be.greaterThan(0);
      });
    });

    describe('#insertLinebreak()', () => {
      it('should insert a line break into the prompt', () => {
        Widget.attach(widget, document.body);

        const model = widget.promptCell!.model;
        expect(model.value.text).to.be.empty;
        widget.insertLinebreak();
        expect(model.value.text).to.equal('\n');
      });
    });

    describe('#serialize()', () => {
      it('should serialize the contents of a console', () => {
        Widget.attach(widget, document.body);
        widget.promptCell!.model.value.text = 'foo';

        const serialized = widget.serialize();
        expect(serialized).to.have.length(1);
        expect(serialized[0].source).to.equal('foo');
      });
    });

    describe('#newPromptCell()', () => {
      it('should be called after attach, creating a prompt', () => {
        expect(widget.promptCell).to.not.be.ok;
        expect(widget.methods).to.not.contain('newPromptCell');
        Widget.attach(widget, document.body);
        expect(widget.methods).to.contain('newPromptCell');
        expect(widget.promptCell).to.be.ok;
      });

      it('should be called after execution, creating a prompt', async () => {
        expect(widget.promptCell).to.not.be.ok;
        expect(widget.methods).to.not.contain('newPromptCell');
        Widget.attach(widget, document.body);
        expect(widget.methods).to.contain('newPromptCell');

        const old = widget.promptCell;
        const force = true;
        expect(old).to.be.an.instanceof(CodeCell);
        widget.methods = [];

        await (widget.sessionContext as SessionContext).initialize();
        await widget.execute(force);

        expect(widget.promptCell).to.be.an.instanceof(CodeCell);
        expect(widget.promptCell).to.not.equal(old);
        expect(widget.methods).to.contain('newPromptCell');
      });
    });

    describe('#onActivateRequest()', () => {
      it('should focus the prompt editor', () => {
        expect(widget.promptCell).to.not.be.ok;
        expect(widget.methods).to.not.contain('onActivateRequest');
        Widget.attach(widget, document.body);
        MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
        expect(widget.methods).to.contain('onActivateRequest');
        expect(widget.promptCell!.editor.hasFocus()).to.equal(true);
      });
    });

    describe('#onAfterAttach()', () => {
      it('should be called after attach, creating a prompt', () => {
        expect(widget.promptCell).to.not.be.ok;
        expect(widget.methods).to.not.contain('onAfterAttach');
        Widget.attach(widget, document.body);
        expect(widget.methods).to.contain('onAfterAttach');
        expect(widget.promptCell).to.be.ok;
      });
    });

    describe('.ContentFactory', () => {
      describe('#constructor', () => {
        it('should create a new ContentFactory', () => {
          const factory = new CodeConsole.ContentFactory({ editorFactory });
          expect(factory).to.be.an.instanceof(CodeConsole.ContentFactory);
        });
      });

      describe('#createCodeCell', () => {
        it('should create a code cell', () => {
          const model = new CodeCellModel({});
          const prompt = contentFactory.createCodeCell({
            rendermime: widget.rendermime,
            model,
            contentFactory
          });
          expect(prompt).to.be.an.instanceof(CodeCell);
        });
      });

      describe('#createRawCell', () => {
        it('should create a foreign cell', () => {
          const model = new RawCellModel({});
          const prompt = contentFactory.createRawCell({
            model,
            contentFactory
          });
          expect(prompt).to.be.an.instanceof(RawCell);
        });
      });
    });

    describe('.ModelFactory', () => {
      describe('#constructor()', () => {
        it('should create a new model factory', () => {
          const factory = new CodeConsole.ModelFactory({});
          expect(factory).to.be.an.instanceof(CodeConsole.ModelFactory);
        });

        it('should accept a codeCellContentFactory', () => {
          const codeCellContentFactory = new CodeCellModel.ContentFactory();
          const factory = new CodeConsole.ModelFactory({
            codeCellContentFactory
          });
          expect(factory.codeCellContentFactory).to.equal(
            codeCellContentFactory
          );
        });
      });

      describe('#codeCellContentFactory', () => {
        it('should be the code cell content factory used by the factory', () => {
          const factory = new CodeConsole.ModelFactory({});
          expect(factory.codeCellContentFactory).to.equal(
            CodeCellModel.defaultContentFactory
          );
        });
      });

      describe('#createCodeCell()', () => {
        it('should create a code cell', () => {
          const factory = new CodeConsole.ModelFactory({});
          expect(factory.createCodeCell({})).to.be.an.instanceof(CodeCellModel);
        });
      });

      describe('#createRawCell()', () => {
        it('should create a raw cell model', () => {
          const factory = new CodeConsole.ModelFactory({});
          expect(factory.createRawCell({})).to.be.an.instanceof(RawCellModel);
        });
      });
    });

    describe('.defaultModelFactory', () => {
      it('should be a ModelFactory', () => {
        expect(CodeConsole.defaultModelFactory).to.be.an.instanceof(
          CodeConsole.ModelFactory
        );
      });
    });
  });
});
