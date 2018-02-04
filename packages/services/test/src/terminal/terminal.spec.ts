// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  PageConfig, uuid
} from '@jupyterlab/coreutils';

import {
  Signal
} from '@phosphor/signaling';

import {
  TerminalSession
} from '../../../lib/terminal';

import {
  handleRequest
} from '../utils';


describe('terminal', () => {

  let defaultSession: TerminalSession.ISession;
  let session: TerminalSession.ISession;

  before(() => {
    TerminalSession.startNew().then(s => {
      defaultSession = s;
    });
  });

  afterEach(() => {
    if (session) {
      return session.shutdown();
    }
  });

  describe('TerminalSession', () => {

    describe('.isAvailable()', () => {

      it('should test whether terminal sessions are available', () => {
        expect(TerminalSession.isAvailable()).to.be(true);
      });

    });

    describe('.startNew()', () => {

      it('should startNew a terminal session', () => {
        return TerminalSession.startNew().then(s => {
          session = s;
          expect(session.name).to.be.ok();
        });
      });

    });

    describe('.connectTo', () => {

      it('should give back an existing session', () => {
        return TerminalSession.connectTo(defaultSession.name).then(newSession => {
          expect(newSession.name).to.be(defaultSession.name);
          expect(newSession).to.not.be(defaultSession);
       });
      });

      it('should reject if the session does not exist on the server', () => {
        return TerminalSession.connectTo(uuid()).then(
          () => { throw Error('should not get here'); },
          () => undefined
        );
      });

    });

    describe('.shutdown()', () => {

      it('should shut down a terminal session by name', () => {
        return TerminalSession.startNew().then(s => {
          session = s;
          return TerminalSession.shutdown(s.name);
        });
      });

      it('should handle a 404 status', () => {
        return TerminalSession.shutdown(uuid());
      });

    });

    describe('.listRunning()', () => {

      it('should list the running session models', () => {
        return TerminalSession.listRunning().then(models => {
          expect(models.length).to.be.greaterThan(0);
        });
      });

    });

  });

  describe('.ISession', () => {

    describe('#terminated', () => {

      it('should be emitted when the session is shut down', (done) => {
        TerminalSession.startNew().then(s => {
          session = s;
          session.terminated.connect((sender, args) => {
            expect(sender).to.be(session);
            expect(args).to.be(void 0);
            done();
          });
          return session.shutdown();
        }).catch(done);
      });

    });

    describe('#messageReceived', () => {

      it('should be emitted when a message is received', (done) => {
        const object = {};
        TerminalSession.startNew().then(s => {
          session = s;
          session.messageReceived.connect((sender, msg) => {
            expect(sender).to.be(session);
            if (msg.type === 'stdout') {
              Signal.disconnectReceiver(object);
              done();
            }
          }, object);
        }).catch(done);
      });

    });

    describe('#name', () => {

      it('should be the name of the session', () => {
        expect(defaultSession.name).to.be.ok();
      });

    });

    context('#serverSettings', () => {

      it('should be the server settings of the server', () => {
        expect(defaultSession.serverSettings.baseUrl).to.be(PageConfig.getBaseUrl());
      });

    });

    describe('#isDisposed', () => {

      it('should test whether the object is disposed', () => {
        return TerminalSession.startNew().then(session => {
          let name = session.name;
          expect(session.isDisposed).to.be(false);
          session.dispose();
          expect(session.isDisposed).to.be(true);
          return TerminalSession.shutdown(name);
        });
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources used by the session', () => {
        TerminalSession.startNew().then(session => {
          let name = session.name;
          session.dispose();
          expect(session.isDisposed).to.be(true);
          return TerminalSession.shutdown(name);
        });
      });

      it('should be safe to call more than once', () => {
        TerminalSession.startNew().then(s => {
          let name = session.name;
          session.dispose();
          session.dispose();
          expect(session.isDisposed).to.be(true);
          return TerminalSession.shutdown(name);
        });
      });

    });

    context('#isReady', () => {

      it('should test whether the terminal is ready', () => {
        return TerminalSession.startNew().then(s => {
          session = s;
          expect(session.isReady).to.be(false);
          return session.ready;
        }).then(() => {
          expect(session.isReady).to.be(true);
        });
      });

    });

    describe('#ready', () => {

      it('should resolve when the terminal is ready', () => {
        return defaultSession.ready;
      });

    });

    describe('#send()', () => {

      it('should send a message to the socket', () => {
        return defaultSession.ready.then(() => {
          session.send({ type: 'stdin', content: [1, 2] });
        });
      });

    });

    describe('#reconnect()', () => {

      it('should reconnect to the socket', () => {
        let session: TerminalSession.ISession;
        return TerminalSession.startNew().then(s => {
          session = s;
          let promise = session.reconnect();
          expect(session.isReady).to.be(false);
          return promise;
        }).then(() => {
          expect(session.isReady).to.be(true);
        });
      });

    });

    describe('#shutdown()', () => {

      it('should shut down the terminal session', () => {
        TerminalSession.startNew().then(session => {
          return session.shutdown();
        });
      });

      it('should handle a 404 status', () => {
        handleRequest(defaultSession, 404, {});
        return defaultSession.shutdown();
      });

    });

  });

});
