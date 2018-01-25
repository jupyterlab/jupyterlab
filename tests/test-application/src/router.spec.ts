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
