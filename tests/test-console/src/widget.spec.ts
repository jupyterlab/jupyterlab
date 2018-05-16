// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  ClientSession
} from '@jupyterlab/apputils';

import {
  CodeConsole
} from '@jupyterlab/console';

import {
  CodeCell, CodeCellModel, RawCellModel, RawCell
} from '@jupyterlab/cells';

import {
  createClientSession
} from '../../utils';

import {
  createCodeCellFactory
} from '../../notebook-utils';

import {
  createConsoleFactory, rendermime, mimeTypeService, editorFactory
} from './utils';


class TestConsole extends CodeConsole {

  methods: string[] = [];

  protected newPromptCell(): void {
    super.newPromptCell();
    this.methods.push('newPromptCell');
  }

  protected onActivateRequest(msg: Message): void {
    super.onActivateRequest(msg);
    this.methods.push('onActivateRequest');
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onAfterAttach');
  }

  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    this.methods.push('onUpdateRequest');
  }
}


const contentFactory = createConsoleFactory();


describe('console/widget', () => {

  describe('CodeConsole', () => {

    let widget: TestConsole;

    beforeEach(() => {
      return createClientSession().then(session => {
        widget = new TestConsole({
          contentFactory, rendermime, session, mimeTypeService
        });
      });
    });

    afterEach(() => {
      return widget.session.shutdown().then(() => {
        widget.session.dispose();
        widget.dispose();
      });
    });

    describe('#constructor()', () => {

      it('should create a new console content widget', () => {
        Widget.attach(widget, document.body);
        expect(widget).to.be.a(CodeConsole);
        expect(widget.node.classList).to.contain('jp-CodeConsole');
      });

    });

    describe('#cells', () => {

      it('should exist upon instantiation', () => {
        expect(widget.cells).to.be.ok();
      });

      it('should reflect the contents of the widget', () => {
        let force = true;
        widget.showAllActivity = true;
        Widget.attach(widget, document.body);
        return (widget.session as ClientSession).initialize().then(() => {
          return widget.execute(force);
        }).then(() => {
          expect(widget.cells.length).to.be(1);
          widget.clear();
          expect(widget.cells.length).to.be(0);
        });
      });

    });

    describe('#executed', () => {

      it('should emit a date upon execution', () => {
        let called: Date = null;
        let force = true;
        Widget.attach(widget, document.body);
        widget.executed.connect((sender, time) => { called = time; });
        return (widget.session as ClientSession).initialize().then(() => {
          return widget.execute(force);
        }).then(() => {
          expect(called).to.be.a(Date);
        });
      });

    });

    describe('#promptCell', () => {

      it('should be a code cell widget', () => {
        Widget.attach(widget, document.body);
        expect(widget.promptCell).to.be.a(CodeCell);
      });

      it('should be replaced after execution', () => {
        let force = true;
        Widget.attach(widget, document.body);

        let old = widget.promptCell;
        expect(old).to.be.a(CodeCell);

        return (widget.session as ClientSession).initialize().then(() => {
          return widget.execute(force);
        }).then(() => {
          expect(widget.promptCell).to.be.a(CodeCell);
          expect(widget.promptCell).to.not.be(old);
        });
      });

    });

    describe('#session', () => {

      it('should be a client session object', () => {
        expect(widget.session.path).to.ok();
      });

    });

    describe('#contentFactory', () => {

      it('should be the content factory used by the widget', () => {
        expect(widget.contentFactory).to.be.a(CodeConsole.ContentFactory);
      });

    });

    describe('#addCell()', () => {

      it('should add a code cell to the content widget', () => {
        let contentFactory = createCodeCellFactory();
        let model = new CodeCellModel({});
        let cell = new CodeCell({ model, contentFactory, rendermime });
        Widget.attach(widget, document.body);
        expect(widget.cells.length).to.be(0);
        widget.addCell(cell);
        expect(widget.cells.length).to.be(1);
      });

    });

    describe('#clear()', () => {

      it('should clear all of the content cells except the banner', () => {
        let force = true;
        Widget.attach(widget, document.body);
        return (widget.session as ClientSession).initialize().then(() => {
          return widget.execute(force);
        }).then(() => {
          expect(widget.cells.length).to.be.greaterThan(0);
          widget.clear();
          expect(widget.cells.length).to.be(0);
          expect(widget.promptCell.model.value.text).to.be('');
        });
      });

    });

    describe('#dispose()', () => {

      it('should dispose the content widget', () => {
        Widget.attach(widget, document.body);
        expect(widget.isDisposed).to.be(false);
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

      it('should be safe to dispose multiple times', () => {
        Widget.attach(widget, document.body);
        expect(widget.isDisposed).to.be(false);
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });

    describe('#execute()', () => {

      it('should execute contents of the prompt if forced', () => {
        let force = true;
        Widget.attach(widget, document.body);
        expect(widget.cells.length).to.be(0);
        return (widget.session as ClientSession).initialize().then(() => {
          return widget.execute(force);
        }).then(() => {
          expect(widget.cells.length).to.be.greaterThan(0);
        });
      });

      it('should check if code is multiline and allow amending', () => {
        let force = false;
        let timeout = 9000;
        Widget.attach(widget, document.body);
        widget.promptCell.model.value.text = 'for x in range(5):';
        expect(widget.cells.length).to.be(0);
        let session = widget.session as ClientSession;
        session.kernelPreference = { name: 'ipython' };
        return session.initialize().then(() => {
          return widget.execute(force, timeout);
        }).then(() => {
          expect(widget.cells.length).to.be(0);
        });
      });

    });

    describe('#inject()', () => {

      it('should add a code cell and execute it', done => {
        let code = 'print("#inject()")';
        Widget.attach(widget, document.body);
        expect(widget.cells.length).to.be(0);
        widget.inject(code).then(() => {
          expect(widget.cells.length).to.be.greaterThan(0);
          done();
        }).catch(done);
      });

    });

    describe('#insertLinebreak()', () => {

      it('should insert a line break into the prompt', () => {
        Widget.attach(widget, document.body);

        let model = widget.promptCell.model;
        expect(model.value.text).to.be.empty();
        widget.insertLinebreak();
        expect(model.value.text).to.be('\n');
      });

    });

    describe('#serialize()', () => {

      it('should serialize the contents of a console', () => {
        Widget.attach(widget, document.body);
        widget.promptCell.model.value.text = 'foo';

        let serialized = widget.serialize();
        expect(serialized).to.have.length(1);
        expect(serialized[0].source).to.be('foo');
      });

    });

    describe('#newPromptCell()', () => {

      it('should be called after attach, creating a prompt', () => {
        expect(widget.promptCell).to.not.be.ok();
        expect(widget.methods).to.not.contain('newPromptCell');
        Widget.attach(widget, document.body);
        expect(widget.methods).to.contain('newPromptCell');
        expect(widget.promptCell).to.be.ok();
      });

      it('should be called after execution, creating a prompt', () => {
        expect(widget.promptCell).to.not.be.ok();
        expect(widget.methods).to.not.contain('newPromptCell');
        Widget.attach(widget, document.body);
        expect(widget.methods).to.contain('newPromptCell');

        let old = widget.promptCell;
        let force = true;
        expect(old).to.be.a(CodeCell);
        widget.methods = [];

        return (widget.session as ClientSession).initialize().then(() => {
          return widget.execute(force);
        }).then(() => {
          expect(widget.promptCell).to.be.a(CodeCell);
          expect(widget.promptCell).to.not.be(old);
          expect(widget.methods).to.contain('newPromptCell');
        });
      });

    });

    describe('#onActivateRequest()', () => {

      it('should focus the prompt editor', done => {
        expect(widget.promptCell).to.not.be.ok();
        expect(widget.methods).to.not.contain('onActivateRequest');
        Widget.attach(widget, document.body);
        requestAnimationFrame(() => {
          widget.activate();
          requestAnimationFrame(() => {
            expect(widget.methods).to.contain('onActivateRequest');
            expect(widget.promptCell.editor.hasFocus()).to.be(true);
            done();
          });
        });
      });

    });

    describe('#onAfterAttach()', () => {

      it('should be called after attach, creating a prompt', () => {
        expect(widget.promptCell).to.not.be.ok();
        expect(widget.methods).to.not.contain('onAfterAttach');
        Widget.attach(widget, document.body);
        expect(widget.methods).to.contain('onAfterAttach');
        expect(widget.promptCell).to.be.ok();
      });

    });

    describe('.ContentFactory', () => {

      describe('#constructor', () => {

        it('should create a new ContentFactory', () => {
          let factory = new CodeConsole.ContentFactory({ editorFactory });
          expect(factory).to.be.a(CodeConsole.ContentFactory);
        });

      });

      describe('#createCodeCell', () => {

        it('should create a code cell', () => {
          let model = new CodeCellModel({});
          let prompt = contentFactory.createCodeCell({
            rendermime: widget.rendermime,
            model,
            contentFactory,
          });
          expect(prompt).to.be.a(CodeCell);
        });

      });

      describe('#createRawCell', () => {

        it('should create a foreign cell', () => {
          let model = new RawCellModel({});
          let prompt = contentFactory.createRawCell({
            model,
            contentFactory,
          });
          expect(prompt).to.be.a(RawCell);
        });

      });

    });

    describe('.ModelFactory', () => {

      describe('#constructor()', () => {

        it('should create a new model factory', () => {
          let factory = new CodeConsole.ModelFactory({});
          expect(factory).to.be.a(CodeConsole.ModelFactory);
        });

        it('should accept a codeCellContentFactory', () => {
          let codeCellContentFactory = new CodeCellModel.ContentFactory();
          let factory = new CodeConsole.ModelFactory({ codeCellContentFactory });
          expect(factory.codeCellContentFactory).to.be(codeCellContentFactory);
        });

      });

      describe('#codeCellContentFactory', () => {

        it('should be the code cell content factory used by the factory', () => {
          let factory = new CodeConsole.ModelFactory({});
          expect(factory.codeCellContentFactory).to.be(CodeCellModel.defaultContentFactory);
        });

      });

      describe('#createCodeCell()', () => {

        it('should create a code cell', () => {
          let factory = new CodeConsole.ModelFactory({});
          expect(factory.createCodeCell({})).to.be.a(CodeCellModel);
        });

      });

      describe('#createRawCell()', () => {

        it('should create a raw cell model', () => {
          let factory = new CodeConsole.ModelFactory({});
          expect(factory.createRawCell({})).to.be.a(RawCellModel);
        });

      });

    });

    describe('.defaultModelFactory', () => {

      it('should be a ModelFactory', () => {
        expect(CodeConsole.defaultModelFactory).to.be.a(CodeConsole.ModelFactory);
      });

    });

  });

});
