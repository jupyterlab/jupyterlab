// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  toArray
} from '@phosphor/algorithm';

import {
  JSONExt
} from '@phosphor/coreutils';

import {
  TerminalSession
} from '../../../lib/terminal';

import {
  getBaseUrl
} from '../../../lib/utils';

import {
  TerminalTester
} from '../utils';


describe('terminals', () => {

  let tester: TerminalTester;
  let session: TerminalSession.ISession;

  beforeEach(() => {
    tester = new TerminalTester();
  });

  afterEach(() => {
    if (session) {
      session.dispose();
    }
    tester.dispose();
  });

  describe('TerminalSession', () => {

    describe('.isAvailable()', () => {

      it('should test whether terminal sessions are available', () => {
        expect(TerminalSession.isAvailable()).to.be(true);
      });

    });

    describe('.startNew()', () => {

      it('should startNew a terminal session', (done) => {
        TerminalSession.startNew().then(s => {
          session = s;
          expect(session.name).to.be.ok();
          done();
        }).catch(done);
      });

    });

    describe('.connectTo', () => {

      it('should give back an existing session', () => {
        return TerminalSession.startNew().then(s => {
          session = s;
          return TerminalSession.connectTo(s.name);
        }).then(newSession => {
            expect(newSession).to.be(session);
         });
      });

      it('should give back a session that exists on the server', () => {
        tester.onRequest = () => {
          tester.respond(200, [{ name: 'foo' }]);
        };
        return TerminalSession.connectTo('foo').then(s => {
          expect(s.name).to.be('foo');
          s.dispose();
        });
      });

      it('should reject if the session does not exist on the server', () => {
        tester.onRequest = () => {
          tester.respond(200, [{ name: 'foo' }]);
        };
        return TerminalSession.connectTo('bar').then(
          () => { throw Error('should not get here'); },
          () => undefined
        );
      });

    });


    describe('.shutdown()', () => {

      it('should shut down a terminal session by name', (done) => {
        TerminalSession.startNew().then(s => {
          session = s;
          return TerminalSession.shutdown(s.name);
        }).then(() => {
          done();
        }).catch(done);
      });

      it('should handle a 404 status', (done) => {
        tester.onRequest = () => {
          tester.respond(404, { });
        };
        TerminalSession.shutdown('foo').then(done, done);
      });

    });

    describe('.listRunning()', () => {

      it('should list the running session models', (done) => {
        let data: TerminalSession.IModel[] = [{ name: 'foo'}, { name: 'bar' }];
        tester.runningTerminals = data;
        TerminalSession.listRunning().then(models => {
          expect(JSONExt.deepEqual(data, toArray(models))).to.be(true);
          done();
        }).catch(done);
      });

    });

  });

  describe('.ISession', () => {

    beforeEach((done) => {
      TerminalSession.startNew().then(s => {
        session = s;
        done();
      });
    });

    afterEach(() => {
      session.dispose();
    });

    describe('#terminated', () => {

      it('should be emitted when the session is shut down', (done) => {
        session.terminated.connect((sender, args) => {
          expect(sender).to.be(session);
          expect(args).to.be(void 0);
          done();
        });
        session.shutdown();
      });

    });

    describe('#messageReceived', () => {

      it('should be emitted when a message is received', (done) => {
        session.messageReceived.connect((sender, msg) => {
          expect(sender).to.be(session);
          expect(msg.type).to.be('stdout');
          expect(toArray(msg.content)).to.eql(['foo bar']);
          done();
        });
        tester.sendRaw(JSON.stringify(['stdout', 'foo bar']));
      });

    });

    describe('#name', () => {

      it('should be the name of the session', (done) => {
        session.dispose();
        TerminalSession.startNew().then(s => {
          session = s;
          expect(session.name).to.be.ok();
          done();
        }).catch(done);
      });

    });

    context('#baseUrl', () => {

      it('should be the base url of the server', () => {
        expect(session.baseUrl).to.be(getBaseUrl());
      });

    });

    describe('#isDisposed', () => {

      it('should test whether the object is disposed', () => {
        expect(session.isDisposed).to.be(false);
        session.dispose();
        expect(session.isDisposed).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources used by the session', () => {
        session.dispose();
        expect(session.isDisposed).to.be(true);
      });

      it('should be safe to call more than once', () => {
        session.dispose();
        session.dispose();
        expect(session.isDisposed).to.be(true);
      });

    });

    context('#isReady', () => {

      it('should test whether the terminal is ready', (done) => {
        session.shutdown();
        TerminalSession.startNew().then(s => {
          session = s;
          expect(session.isReady).to.be(false);
          return session.ready;
        }).then(() => {
          expect(session.isReady).to.be(true);
          done();
        }).catch(done);
      });

    });

    describe('#ready', () => {

      it('should resolve when the terminal is ready', (done) => {
        session.ready.then(done, done);
      });

    });

    describe('#send()', () => {

      it('should send a message to the socket', (done) => {
        tester.onMessage(msg => {
          expect(msg.type).to.be('stdin');
          done();
        });
        session.ready.then(() => {
          session.send({ type: 'stdin', content: [1, 2] });
        }).catch(done);
      });

    });

    describe('#reconnect()', () => {

      it('should reconnect to the socket', (done) => {
        session.ready.then(() => {
          let promise = session.reconnect();
          expect(session.isReady).to.be(false);
          return promise;
        }).then(() => {
          expect(session.isReady).to.be(true);
        }).then(done, done);
      });

    });

    describe('#shutdown()', () => {

      it('should shut down the terminal session', (done) => {
        session.shutdown().then(done, done);
      });

      it('should handle a 404 status', (done) => {
        tester.onRequest = () => {
          tester.respond(404, { });
        };
        session.shutdown().then(done, done);
      });

    });

  });

});
