// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Router
} from '@jupyterlab/application';

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  Token
} from '@phosphor/coreutils';


const base = '/';


describe('apputils', () => {

  describe('Router', () => {

    let commands: CommandRegistry;
    let router: Router;

    beforeEach(() => {
      commands = new CommandRegistry();
      router = new Router({ base, commands });
    });

    describe('#constructor()', () => {

      it('should construct a new router', () => {
        expect(router).to.be.a(Router);
      });

    });

    describe('#base', () => {

      it('should be the base URL of the application', () => {
        expect(router.base).to.be(base);
      });

    });

    describe('#commands', () => {

      it('should be the command registry used by the router', () => {
        expect(router.commands).to.be(commands);
      });

    });

    describe('#current', () => {

      it('should return the current window location as an object', () => {
        // The karma test window location is a file called `context.html`
        // without any query string parameters.
        const path = 'context.html';
        const request = path;
        const search = '';

        expect(router.current).to.eql({ path, request, search });
      });

    });

    describe('#routed', () => {

      it('should emit a signal when a path is routed', done => {
        let routed = false;

        commands.addCommand('a', { execute: () => { routed = true; } });
        router.register({ command: 'a', pattern: /.*/, rank: 10 });
        router.route();

        router.routed.connect(() => {
          expect(routed).to.be(true);
          done();
        });
      });

    });

    describe('#stop', () => {

      it('should be a unique token', () => {
        expect(router.stop).to.be.a(Token);
      });

      it('should stop routing if returned by a routed command', done => {
        const wanted = ['a', 'b'];
        let recorded: string[] = [];

        commands.addCommand('a', { execute: () => { recorded.push('a'); } });
        commands.addCommand('b', { execute: () => { recorded.push('b'); } });
        commands.addCommand('c', { execute: () => router.stop });
        commands.addCommand('d', { execute: () => { recorded.push('d'); } });

        router.register({ command: 'a', pattern: /.*/, rank: 10 });
        router.register({ command: 'b', pattern: /.*/, rank: 20 });
        router.register({ command: 'c', pattern: /.*/, rank: 30 });
        router.register({ command: 'd', pattern: /.*/, rank: 40 });

        router.route();

        router.routed.connect(() => {
          expect(recorded).to.eql(wanted);
          done();
        });
      });

    });

  });

});
