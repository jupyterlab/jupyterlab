// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Router } from '@jupyterlab/application';
import { signalToPromise } from '@jupyterlab/testing';
import { CommandRegistry } from '@lumino/commands';
import { Token } from '@lumino/coreutils';

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
        expect(router).toBeInstanceOf(Router);
      });
    });

    describe('#base', () => {
      it('should be the base URL of the application', () => {
        expect(router.base).toBe(base);
      });
    });

    describe('#commands', () => {
      it('should be the command registry used by the router', () => {
        expect(router.commands).toBe(commands);
      });
    });

    describe('#current', () => {
      it('should return the current window location as an object', () => {
        const path = '/';
        const request = path;
        const search = '';
        const hash = '';

        expect(router.current).toEqual({ hash, path, request, search });
      });
    });

    describe('#routed', () => {
      it('should emit a signal when a path is routed', async () => {
        let routed = false;

        commands.addCommand('a', {
          execute: () => {
            routed = true;
          }
        });
        router.register({ command: 'a', pattern: /.*/, rank: 10 });

        let called = false;
        router.routed.connect(() => {
          expect(routed).toBe(true);
          called = true;
        });
        await router.route();
        expect(called).toBe(true);
      });
    });

    describe('#stop', () => {
      it('should be a unique token', () => {
        expect(router.stop).toBeInstanceOf(Token);
      });

      it('should stop routing if returned by a routed command', async () => {
        const wanted = ['a', 'b'];
        const recorded: string[] = [];

        commands.addCommand('a', {
          execute: () => {
            recorded.push('a');
          }
        });
        commands.addCommand('b', {
          execute: () => {
            recorded.push('b');
          }
        });
        commands.addCommand('c', { execute: () => router.stop });
        commands.addCommand('d', {
          execute: () => {
            recorded.push('d');
          }
        });

        router.register({ command: 'a', pattern: /.*/, rank: 10 });
        router.register({ command: 'b', pattern: /.*/, rank: 20 });
        router.register({ command: 'c', pattern: /.*/, rank: 30 });
        router.register({ command: 'd', pattern: /.*/, rank: 40 });

        const promise = signalToPromise(router.routed);
        await router.route();
        await promise;
        expect(recorded).toEqual(wanted);
      });
    });

    describe('#navigate()', () => {
      it.skip('cannot be tested since changing location is a security risk', () => {
        // Router#navigate() changes window.location.href but karma tests
        // disallow changing the window location.
      });
    });

    describe('#register()', () => {
      it('should register a command with a route pattern', async () => {
        const wanted = ['a'];
        const recorded: string[] = [];

        commands.addCommand('a', {
          execute: () => {
            recorded.push('a');
          }
        });
        router.register({ command: 'a', pattern: /.*/ });

        let called = false;
        router.routed.connect(() => {
          expect(recorded).toEqual(wanted);
          called = true;
        });
        await router.route();
        expect(called).toBe(true);
      });
    });

    describe('#route()', () => {
      it('should route the location to a command', async () => {
        const wanted = ['a'];
        const recorded: string[] = [];

        commands.addCommand('a', {
          execute: () => {
            recorded.push('a');
          }
        });
        router.register({ command: 'a', pattern: /#a/, rank: 10 });
        expect(recorded.length).toBe(0);

        // Change the hash because changing location is a security error.
        window.location.hash = 'a';

        let called = false;
        router.routed.connect(() => {
          expect(recorded).toEqual(wanted);
          window.location.hash = '';
          called = true;
        });
        await router.route();
        expect(called).toBe(true);
      });
    });
  });
});
