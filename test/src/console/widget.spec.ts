// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Session, utils
} from '@jupyterlab/services';

import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgetwidget';

import {
  CodeConsole
} from '../../../lib/console';

import {
  ConsoleHistory
} from '../../../lib/console/history';

import {
  ForeignHandler
} from '../../../lib/console/foreign';

import {
  BaseCellWidget, CodeCellWidget, CodeCellModel, RawCellModel, RawCellWidget
} from '../../../lib/cells';

import {
  createCodeCellFactory
} from '../notebook/utils';

import {
  createConsoleFactory, rendermime, mimeTypeService, editorFactory
} from './utils';


class TestConsole extends CodeConsole {

  methods: string[] = [];

  protected newPrompt(): void {
    super.newPrompt();
    this.methods.push('newPrompt');
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

    let session: Session.ISession;
    let widget: TestConsole;

    beforeEach(done => {
      Session.startNew({ path: utils.uuid() }).then(newSession => {
        session = newSession;
        widget = new TestConsole({ contentFactory, rendermime, session,
                                   mimeTypeService });
        done();
      });
    });

    afterEach(done => {
      session.shutdown().then(() => {
        session.dispose();
        widget.dispose();
        done();
      }).catch(done);
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

      it('should reflect the contents of the widget', done => {
        let force = true;
        Widget.attach(widget, document.body);
        widget.execute(force).then(() => {
          expect(widget.cells.length).to.be(1);
          widget.clear();
          expect(widget.cells.length).to.be(0);
          done();
        }).catch(done);
      });

    });

    describe('#executed', () => {

      it('should emit a date upon execution', done => {
        let called: Date = null;
        let force = true;
        Widget.attach(widget, document.body);
        widget.executed.connect((sender, time) => { called = time; });
        widget.execute(force).then(() => {
          expect(called).to.be.a(Date);
          done();
        }).catch(done);
      });

    });

    describe('#prompt', () => {

      it('should be a code cell widget', () => {
        Widget.attach(widget, document.body);
        expect(widget.prompt).to.be.a(CodeCellWidget);
      });

      it('should be replaced after execution', done => {
        let force = true;
        Widget.attach(widget, document.body);

        let old = widget.prompt;
        expect(old).to.be.a(CodeCellWidget);

        widget.execute(force).then(() => {
          expect(widget.prompt).to.be.a(CodeCellWidget);
          expect(widget.prompt).to.not.be(old);
          done();
        }).catch(done);
      });

    });

    describe('#session', () => {

      it('should return the session passed in at instantiation', () => {
        expect(widget.session).to.be(session);
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
        let cell = new CodeCellWidget({ model, contentFactory, rendermime });
        Widget.attach(widget, document.body);
        expect(widget.cells.length).to.be(0);
        widget.addCell(cell);
        expect(widget.cells.length).to.be(1);
      });

    });

    describe('#clear()', () => {

      it('should clear all of the content cells except the banner', done => {
        let force = true;
        Widget.attach(widget, document.body);
        widget.execute(force).then(() => {
          expect(widget.cells.length).to.be.greaterThan(0);
          widget.clear();
          expect(widget.cells.length).to.be(0);
          expect(widget.prompt.model.value.text).to.be('');
          done();
        }).catch(done);
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

      it('should execute contents of the prompt if forced', done => {
        let force = true;
        Widget.attach(widget, document.body);
        expect(widget.cells.length).to.be(0);
        widget.execute(force).then(() => {
          expect(widget.cells.length).to.be.greaterThan(0);
          done();
        }).catch(done);
      });

      it('should check if code is multiline and allow amending', done => {
        let force = false;
        let timeout = 9000;
        Widget.attach(widget, document.body);
        widget.prompt.model.value.text = 'for x in range(5):';
        expect(widget.cells.length).to.be(0);
        widget.execute(force, timeout).then(() => {
          expect(widget.cells.length).to.be(0);
          done();
        }).catch(done);
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

        let model = widget.prompt.model;
        expect(model.value.text).to.be.empty();
        widget.insertLinebreak();
        expect(model.value.text).to.be('\n');
      });

    });

    describe('#serialize()', () => {

      it('should serialize the contents of a console', () => {
        Widget.attach(widget, document.body);
        widget.prompt.model.value.text = 'foo';

        let serialized = widget.serialize();
        expect(serialized).to.have.length(2);
        expect(serialized[1].source).to.be('foo');
      });

    });

    describe('#newPrompt()', () => {

      it('should be called after attach, creating a prompt', () => {
        expect(widget.prompt).to.not.be.ok();
        expect(widget.methods).to.not.contain('newPrompt');
        Widget.attach(widget, document.body);
        expect(widget.methods).to.contain('newPrompt');
        expect(widget.prompt).to.be.ok();
      });

      it('should be called after execution, creating a prompt', done => {
        expect(widget.prompt).to.not.be.ok();
        expect(widget.methods).to.not.contain('newPrompt');
        Widget.attach(widget, document.body);
        expect(widget.methods).to.contain('newPrompt');

        let old = widget.prompt;
        let force = true;
        expect(old).to.be.a(CodeCellWidget);
        widget.methods = [];

        widget.execute(force).then(() => {
          expect(widget.prompt).to.be.a(CodeCellWidget);
          expect(widget.prompt).to.not.be(old);
          expect(widget.methods).to.contain('newPrompt');
          done();
        }).catch(done);
      });

    });

    describe('#onActivateRequest()', () => {

      it('should focus the prompt editor', done => {
        expect(widget.prompt).to.not.be.ok();
        expect(widget.methods).to.not.contain('onActivateRequest');
        Widget.attach(widget, document.body);
        requestAnimationFrame(() => {
          widget.activate();
          requestAnimationFrame(() => {
            expect(widget.methods).to.contain('onActivateRequest');
            expect(widget.prompt.editor.hasFocus()).to.be(true);
            done();
          });
        });
      });

    });

    describe('#onAfterAttach()', () => {

      it('should be called after attach, creating a prompt', () => {
        expect(widget.prompt).to.not.be.ok();
        expect(widget.methods).to.not.contain('onAfterAttach');
        Widget.attach(widget, document.body);
        expect(widget.methods).to.contain('onAfterAttach');
        expect(widget.prompt).to.be.ok();
      });

    });

    describe('#onUpdateRequest()', () => {

      it('should be called upon an update, after attach', done => {
        expect(widget.methods).to.not.contain('onUpdateRequest');
        Widget.attach(widget, document.body);
        requestAnimationFrame(() => {
          expect(widget.methods).to.contain('onUpdateRequest');
          done();
        });
      });

    });

    describe('.ContentFactory', () => {

      describe('#constructor', () => {

        it('should create a new ContentFactory', () => {
          let factory = new CodeConsole.ContentFactory({ editorFactory });
          expect(factory).to.be.a(CodeConsole.ContentFactory);
        });

      });

      describe('#rawCellContentFactory', () => {

        it('should be the raw cell ContentFactory used by the factory', () => {
          expect(contentFactory.rawCellContentFactory).to.be.a(BaseCellWidget.ContentFactory);
        });

      });

      describe('#codeCellContentFactory', () => {

        it('should be the code cell ContentFactory used by the factory', () => {
          expect(contentFactory.codeCellContentFactory).to.be.a(CodeCellWidget.ContentFactory);
        });

      });

      describe('#createConsoleHistory', () => {

        it('should create a ConsoleHistory', () => {
          let history = contentFactory.createConsoleHistory({});
          expect(history).to.be.a(ConsoleHistory);
        });

      });

      describe('#createForeignHandler', () => {

        it('should create a ForeignHandler', () => {
          let cellFactory = () => {
            let model = new CodeCellModel({});
            let rendermime = widget.rendermime;
            let factory = contentFactory.codeCellContentFactory;
            let options: CodeCellWidget.IOptions = {
              model, rendermime, contentFactory: factory
            };
            return contentFactory.createForeignCell(options, widget);
          };
          let handler = contentFactory.createForeignHandler({
            kernel: null,
            parent: widget,
            cellFactory
          });
          expect(handler).to.be.a(ForeignHandler);
        });

      });

      describe('#createBanner', () => {

        it('should create a banner cell', () => {
          let model = new RawCellModel({});
          let banner = contentFactory.createBanner({
            model,
            contentFactory: contentFactory.rawCellContentFactory
          }, widget);
          expect(banner).to.be.a(RawCellWidget);
        });

      });

      describe('#createPrompt', () => {

        it('should create a prompt cell', () => {
          let model = new CodeCellModel({});
          let prompt = contentFactory.createPrompt({
            rendermime: widget.rendermime,
            model,
            contentFactory: contentFactory.codeCellContentFactory
          }, widget);
          expect(prompt).to.be.a(CodeCellWidget);
        });

      });

      describe('#createForeignCell', () => {

        it('should create a foreign cell', () => {
          let model = new CodeCellModel({});
          let prompt = contentFactory.createForeignCell({
            rendermime: widget.rendermime,
            model,
            contentFactory: contentFactory.codeCellContentFactory
          }, widget);
          expect(prompt).to.be.a(CodeCellWidget);
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
