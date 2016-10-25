// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  utils, Session
} from '@jupyterlab/services';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  CodeMirrorConsoleRenderer
} from '../../../lib/console/codemirror/widget';

import {
  ConsoleContent
} from '../../../lib/console/content';

import {
  InspectionHandler
} from '../../../lib/inspector';

import {
  CodeCellWidget
} from '../../../lib/notebook/cells';

import {
  EdgeLocation, ICellEditorWidget, ITextChange
} from '../../../lib/notebook/cells/editor';

import {
  defaultRenderMime
} from '../utils';


class TestContent extends ConsoleContent {
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

  protected onEdgeRequest(editor: ICellEditorWidget, location: EdgeLocation): void {
    super.onEdgeRequest(editor, location);
    this.methods.push('onEdgeRequest');
  }

  protected onTextChange(editor: ICellEditorWidget, args: ITextChange): void {
    super.onTextChange(editor, args);
    this.methods.push('onTextChange');
  }

  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    this.methods.push('onUpdateRequest');
  }
}


const CONSOLE_CLASS = 'jp-ConsoleContent';
const renderer = CodeMirrorConsoleRenderer.defaultRenderer;
const rendermime = defaultRenderMime();


describe('console/content', () => {

  describe('ConsoleContent', () => {

    describe('#constructor()', () => {

      it('should create a new console content widget', done => {
        Session.startNew({ path: utils.uuid() }).then(session => {
          let widget = new ConsoleContent({ renderer, rendermime, session });
          Widget.attach(widget, document.body);
          expect(widget).to.be.a(ConsoleContent);
          expect(widget.node.classList.contains(CONSOLE_CLASS)).to.be(true);
          widget.dispose();
          done();
        }).catch(done);
      });

    });

    describe('#executed', () => {

      it('should emit a date upon execution', done => {
        Session.startNew({ path: utils.uuid() }).then(session => {
          let widget = new ConsoleContent({ renderer, rendermime, session });
          let called: Date = null;
          let force = true;
          Widget.attach(widget, document.body);
          widget.executed.connect((sender, time) => { called = time; });
          widget.execute(force).then(() => {
            expect(called).to.be.a(Date);
            widget.dispose();
            done();
          });
        }).catch(done);
      });

    });

    describe('#inspectionHandler', () => {

      it('should exist after instantiation', done => {
        Session.startNew({ path: utils.uuid() }).then(session => {
          let widget = new ConsoleContent({ renderer, rendermime, session });
          Widget.attach(widget, document.body);
          expect(widget.inspectionHandler).to.be.an(InspectionHandler);
          widget.dispose();
          done();
        }).catch(done);
      });

    });

    describe('#prompt', () => {

      it('should be a code cell widget', done => {
        Session.startNew({ path: utils.uuid() }).then(session => {
          let widget = new ConsoleContent({ renderer, rendermime, session });
          Widget.attach(widget, document.body);
          expect(widget.prompt).to.be.a(CodeCellWidget);
          widget.dispose();
          done();
        }).catch(done);
      });

      it('should be replaced after execution', done => {
        Session.startNew({ path: utils.uuid() }).then(session => {
          let widget = new ConsoleContent({ renderer, rendermime, session });
          let force = true;
          Widget.attach(widget, document.body);

          let old = widget.prompt;
          expect(old).to.be.a(CodeCellWidget);

          widget.execute(force).then(() => {
            expect(widget.prompt).to.be.a(CodeCellWidget);
            expect(widget.prompt).to.not.be(old);
            widget.dispose();
            done();
          }).catch(done);
        });
      });

    });

    describe('#session', () => {

      it('should return the session passed in at instantiation', done => {
        Session.startNew({ path: utils.uuid() }).then(session => {
          let widget = new ConsoleContent({ renderer, rendermime, session });
          Widget.attach(widget, document.body);
          expect(widget.session).to.be(session);
          widget.dispose();
          done();
        }).catch(done);
      });

    });

    describe('#clear()', () => {

      it('should clear all of the content cells except the banner', done => {
        Session.startNew({ path: utils.uuid() }).then(session => {
          let widget = new ConsoleContent({ renderer, rendermime, session });
          let force = true;
          Widget.attach(widget, document.body);
          widget.execute(force).then(() => {
            expect(widget.content.widgets.length).to.be.greaterThan(1);
            widget.clear();
            expect(widget.content.widgets.length).to.be(1);
            widget.dispose();
            done();
          });
        }).catch(done);
      });

    });

    describe('#dispose()', () => {

      it('should dispose the content widget', done => {
        Session.startNew({ path: utils.uuid() }).then(session => {
          let widget = new ConsoleContent({ renderer, rendermime, session });
          Widget.attach(widget, document.body);
          expect(widget.isDisposed).to.be(false);
          widget.dispose();
          expect(widget.isDisposed).to.be(true);
          done();
        }).catch(done);
      });

      it('should be safe to dispose multiple times', done => {
        Session.startNew({ path: utils.uuid() }).then(session => {
          let widget = new ConsoleContent({ renderer, rendermime, session });
          Widget.attach(widget, document.body);
          expect(widget.isDisposed).to.be(false);
          widget.dispose();
          widget.dispose();
          expect(widget.isDisposed).to.be(true);
          done();
        }).catch(done);
      });

    });

    describe('#execute()', () => {

      it('should execute contents of the prompt if forced', done => {
        Session.startNew({ path: utils.uuid() }).then(session => {
          let widget = new ConsoleContent({ renderer, rendermime, session });
          let force = true;
          Widget.attach(widget, document.body);
          expect(widget.content.widgets.length).to.be(1);
          widget.execute(force).then(() => {
            expect(widget.content.widgets.length).to.be.greaterThan(1);
            widget.dispose();
            done();
          }).catch(done);
        });
      });

      it('should check if code is multiline and allow amending', done => {
        Session.startNew({ path: utils.uuid() }).then(session => {
          let widget = new ConsoleContent({ renderer, rendermime, session });
          let force = false;
          let timeout = 9000;
          Widget.attach(widget, document.body);
          widget.prompt.model.source = 'for x in range(5):';
          expect(widget.content.widgets.length).to.be(1);
          widget.execute(force, timeout).then(() => {
            expect(widget.content.widgets.length).to.be(1);
            widget.dispose();
            done();
          }).catch(done);
        });
      });

    });

    describe('#inject()', () => {

      it('should add a code cell and execute it', done => {
        Session.startNew({ path: utils.uuid() }).then(session => {
          let widget = new ConsoleContent({ renderer, rendermime, session });
          let code = 'print("Hello.")';
          Widget.attach(widget, document.body);
          expect(widget.content.widgets.length).to.be(1);
          widget.inject(code).then(() => {
            expect(widget.content.widgets.length).to.be.greaterThan(1);
            widget.dispose();
            done();
          }).catch(done);
        });
      });

    });

    describe('#insertLinebreak()', () => {

      it('should insert a line break into the prompt', done => {
        Session.startNew({ path: utils.uuid() }).then(session => {
          let widget = new ConsoleContent({ renderer, rendermime, session });
          Widget.attach(widget, document.body);

          let model = widget.prompt.model;
          expect(model.source).to.be.empty();
          widget.insertLinebreak();
          expect(model.source).to.be('\n');
          widget.dispose();
          done();
        }).catch(done);
      });

    });

    describe('#serialize()', () => {

      it('should serialize the contents of a console', done => {
        Session.startNew({ path: utils.uuid() }).then(session => {
          let widget = new ConsoleContent({ renderer, rendermime, session });
          Widget.attach(widget, document.body);
          widget.prompt.model.source = 'foo';

          let serialized = widget.serialize();
          expect(serialized).to.have.length(2);
          expect(serialized[1].source).to.be('foo');
          widget.dispose();
          done();
        }).catch(done);
      });

    });

    describe('#newPrompt()', () => {

      it('should be called after attach, creating a prompt', done => {
        Session.startNew({ path: utils.uuid() }).then(session => {
          let widget = new TestContent({ renderer, rendermime, session });
          expect(widget.prompt).to.not.be.ok();
          expect(widget.methods).to.not.contain('newPrompt');
          Widget.attach(widget, document.body);
          expect(widget.methods).to.contain('newPrompt');
          expect(widget.prompt).to.be.ok();
          widget.dispose();
          done();
        }).catch(done);
      });

      it('should be called after execution, creating a prompt', done => {
        Session.startNew({ path: utils.uuid() }).then(session => {
          let widget = new TestContent({ renderer, rendermime, session });

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
            widget.dispose();
            done();
          }).catch(done);

          done();
        }).catch(done);
      });

    });

    describe('#onActivateRequest()', () => {

      it('should focus the prompt editor', done => {
        Session.startNew({ path: utils.uuid() }).then(session => {
          let widget = new TestContent({ renderer, rendermime, session });
          expect(widget.prompt).to.not.be.ok();
          expect(widget.methods).to.not.contain('onActivateRequest');
          Widget.attach(widget, document.body);
          requestAnimationFrame(() => {
            widget.activate();
            requestAnimationFrame(() => {
              expect(widget.methods).to.contain('onActivateRequest');
              expect(widget.prompt.editor.hasFocus()).to.be(true);
              widget.dispose();
              done();
            });
          });
        }).catch(done);
      });

    });

    describe('#onAfterAttach()', () => {

      it('should be called after attach, creating a prompt', done => {
        Session.startNew({ path: utils.uuid() }).then(session => {
          let widget = new TestContent({ renderer, rendermime, session });
          expect(widget.prompt).to.not.be.ok();
          expect(widget.methods).to.not.contain('onAfterAttach');
          Widget.attach(widget, document.body);
          expect(widget.methods).to.contain('onAfterAttach');
          expect(widget.prompt).to.be.ok();
          widget.dispose();
          done();
        }).catch(done);
      });

    });

    describe('#onEdgeRequest()', () => {

      it('should be called upon an editor edge request', done => {
        Session.startNew({ path: utils.uuid() }).then(session => {
          let widget = new TestContent({ renderer, rendermime, session });
          Widget.attach(widget, document.body);
          // This setTimeout is a crude method to allow the history backlog
          // to be populated. Because there is no signal for history readiness
          // and because such a signal is undesirable, this test resorts to
          // simply waiting. If it becomes an issue, we can remove the line that
          // compares sources and simply verify that the onEdgeRequest method
          // has been invoked.
          setTimeout(() => {
            let old = widget.prompt.model.source;
            expect(widget.methods).to.not.contain('onEdgeRequest');
            widget.prompt.editor.edgeRequested.emit('top');
            expect(widget.methods).to.contain('onEdgeRequest');
            requestAnimationFrame(() => {
              expect(widget.prompt.model.source).to.not.be(old);
              widget.dispose();
              done();
            });
          }, 1500);
        }).catch(done);
      });

    });

    describe('#onTextChange()', () => {

      it('should be called upon an editor text change', done => {
        Session.startNew({ path: utils.uuid() }).then(session => {
          let widget = new TestContent({ renderer, rendermime, session });
          let change: ITextChange = {
            ch: 0,
            chHeight: 0,
            chWidth: 0,
            line: 0,
            position: 0,
            coords: null,
            oldValue: 'fo',
            newValue: 'foo'
          };
          Widget.attach(widget, document.body);
          expect(widget.methods).to.not.contain('onTextChange');
          widget.prompt.editor.textChanged.emit(change);
          expect(widget.methods).to.contain('onTextChange');
          widget.dispose();
          done();
        });
      });

    });

    describe('#onUpdateRequest()', () => {

      it('should be called upon an update, after attach', done => {
        Session.startNew({ path: utils.uuid() }).then(session => {
          let widget = new TestContent({ renderer, rendermime, session });
          expect(widget.methods).to.not.contain('onUpdateRequest');
          Widget.attach(widget, document.body);
          requestAnimationFrame(() => {
            expect(widget.methods).to.contain('onUpdateRequest');
            widget.dispose();
            done();
          });
        }).catch(done);
      });

    });

  });

});
