// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CommandLinker, Dialog } from '@jupyterlab/apputils';
import {
  dismissDialog,
  isFulfilled,
  signalToPromises,
  waitForDialog
} from '@jupyterlab/testing';
import { CommandRegistry } from '@lumino/commands';
import type { VirtualNode } from '@lumino/virtualdom';
import { h, VirtualDOM } from '@lumino/virtualdom';
import { simulate } from 'simulate-event';

async function clickDialogButtonByText(text: string): Promise<void> {
  await waitForDialog();
  const node = Array.from(
    document.body.querySelectorAll('.jp-Dialog .jp-Dialog-button')
  ).find(button => button.textContent?.trim() === text);
  if (node) {
    simulate(node as HTMLElement, 'click', { button: 0 });
    return;
  }

  throw new Error(`Dialog button with text "${text}" not found`);
}

describe('@jupyterlab/apputils', () => {
  describe('CommandLinker', () => {
    afterEach(async () => {
      await dismissDialog();
      Dialog.flush();
    });

    describe('#constructor()', () => {
      it('should create a command linker', () => {
        const linker = new CommandLinker({ commands: new CommandRegistry() });
        expect(linker).toBeInstanceOf(CommandLinker);
        linker.dispose();
      });
    });

    describe('#isDisposed', () => {
      it('should test whether a command linker has been disposed', () => {
        const linker = new CommandLinker({ commands: new CommandRegistry() });
        expect(linker.isDisposed).toBe(false);
        linker.dispose();
        expect(linker.isDisposed).toBe(true);
      });
    });

    describe('#connectNode()', () => {
      it('should connect a node to a command', () => {
        let called = false;
        const command = 'commandlinker:connect-node';
        const commands = new CommandRegistry();
        const linker = new CommandLinker({ commands });
        const node = document.createElement('div');
        const disposable = commands.addCommand(command, {
          execute: () => {
            called = true;
          }
        });

        linker.markTrusted(node);
        document.body.appendChild(node);
        linker.connectNode(node, command, undefined);

        expect(called).toBe(false);
        simulate(node, 'click');
        expect(called).toBe(true);

        document.body.removeChild(node);
        linker.dispose();
        disposable.dispose();
      });
    });

    describe('#disconnectNode()', () => {
      it('should disconnect a node from a command', () => {
        let called = false;
        const command = 'commandlinker:disconnect-node';
        const commands = new CommandRegistry();
        const linker = new CommandLinker({ commands });
        const node = document.createElement('div');
        const disposable = commands.addCommand(command, {
          execute: () => {
            called = true;
          }
        });

        linker.markTrusted(node);
        document.body.appendChild(node);
        linker.connectNode(node, command, undefined);

        // Make sure connection is working.
        expect(called).toBe(false);
        simulate(node, 'click');
        expect(called).toBe(true);

        // Reset flag.
        called = false;

        // Make sure disconnection is working.
        linker.disconnectNode(node);
        expect(called).toBe(false);
        simulate(node, 'click');
        expect(called).toBe(false);

        document.body.removeChild(node);
        linker.dispose();
        disposable.dispose();
      });
    });

    describe('#dispose()', () => {
      it('should dispose the resources held by the linker', () => {
        const linker = new CommandLinker({ commands: new CommandRegistry() });
        expect(linker.isDisposed).toBe(false);
        linker.dispose();
        expect(linker.isDisposed).toBe(true);
      });
    });

    describe('#populateVNodeDataset()', () => {
      it('should connect a node to a command', () => {
        let called = false;
        const command = 'commandlinker:connect-node';
        const commands = new CommandRegistry();
        const linker = new CommandLinker({ commands });
        let node: HTMLElement;
        let vnode: VirtualNode;
        const disposable = commands.addCommand(command, {
          execute: () => {
            called = true;
          }
        });

        vnode = h.div({
          dataset: linker.populateVNodeDataset(command, undefined)
        });
        node = VirtualDOM.realize(vnode);
        linker.markTrusted(node);
        document.body.appendChild(node);

        expect(called).toBe(false);
        simulate(node, 'click');
        expect(called).toBe(true);

        document.body.removeChild(node);
        linker.dispose();
        disposable.dispose();
      });
    });

    describe('#trustGuard', () => {
      it('should not execute when the user cancels', async () => {
        let called = false;
        const command = 'commandlinker:untrusted-cancel';
        const commands = new CommandRegistry();
        const linker = new CommandLinker({ commands });
        const wrapper = document.createElement('div');
        const node = document.createElement('div');
        const disposable = commands.addCommand(command, {
          execute: () => {
            called = true;
          }
        });

        wrapper.appendChild(node);
        document.body.appendChild(wrapper);
        linker.connectNode(node, command, undefined);

        const executions = signalToPromises(commands.commandExecuted, 1);
        simulate(node, 'click');
        await Promise.resolve();
        await Promise.resolve();
        await dismissDialog();

        expect(called).toBe(false);
        expect(await isFulfilled(executions[0], 50)).toBe(false);

        document.body.removeChild(wrapper);
        linker.dispose();
        disposable.dispose();
      });

      it('should execute when the user chooses run once', async () => {
        let called = false;
        const command = 'commandlinker:untrusted-run-once';
        const commands = new CommandRegistry();
        const linker = new CommandLinker({ commands });
        const wrapper = document.createElement('div');
        const node = document.createElement('div');
        const disposable = commands.addCommand(command, {
          execute: () => {
            called = true;
          }
        });

        wrapper.appendChild(node);
        document.body.appendChild(wrapper);
        linker.connectNode(node, command, undefined);

        const executions = signalToPromises(commands.commandExecuted, 1);
        simulate(node, 'click');
        await Promise.resolve();
        await Promise.resolve();
        await clickDialogButtonByText('Run');
        const [, executed] = await executions[0];

        expect(called).toBe(true);
        expect(executed.id).toBe(command);
        await expect(executed.result).resolves.toBeUndefined();

        document.body.removeChild(wrapper);
        linker.dispose();
        disposable.dispose();
      });

      it('should execute when trust succeeds', async () => {
        const calls: string[] = [];
        const command = 'commandlinker:untrusted-trust';
        const trustCommand = 'commandlinker:trust';
        const commands = new CommandRegistry();
        const linker = new CommandLinker({ commands });
        const wrapper = document.createElement('div');
        const node = document.createElement('div');
        const disposable = commands.addCommand(command, {
          execute: () => {
            calls.push('command');
          }
        });
        const trustDisposable = commands.addCommand(trustCommand, {
          execute: () => {
            calls.push('trust');
            return { trusted: true };
          }
        });

        wrapper.setAttribute('data-trust-command', trustCommand);
        wrapper.appendChild(node);
        document.body.appendChild(wrapper);
        linker.connectNode(node, command, undefined);

        const executions = signalToPromises(commands.commandExecuted, 2);
        simulate(node, 'click');
        await Promise.resolve();
        await Promise.resolve();
        await clickDialogButtonByText('Trust');
        const [, trustExecution] = await executions[0];
        const [, commandExecution] = await executions[1];

        expect(calls).toEqual(['trust', 'command']);
        expect(trustExecution.id).toBe(trustCommand);
        expect(commandExecution.id).toBe(command);
        await expect(trustExecution.result).resolves.toEqual({ trusted: true });
        await expect(commandExecution.result).resolves.toBeUndefined();

        document.body.removeChild(wrapper);
        linker.dispose();
        trustDisposable.dispose();
        disposable.dispose();
      });

      it('should not execute when trust returns false', async () => {
        const calls: string[] = [];
        const command = 'commandlinker:untrusted-trust-false';
        const trustCommand = 'commandlinker:trust-false';
        const commands = new CommandRegistry();
        const linker = new CommandLinker({ commands });
        const wrapper = document.createElement('div');
        const node = document.createElement('div');
        const disposable = commands.addCommand(command, {
          execute: () => {
            calls.push('command');
          }
        });
        const trustDisposable = commands.addCommand(trustCommand, {
          execute: () => {
            calls.push('trust');
            return { trusted: false };
          }
        });

        wrapper.setAttribute('data-trust-command', trustCommand);
        wrapper.appendChild(node);
        document.body.appendChild(wrapper);
        linker.connectNode(node, command, undefined);

        const executions = signalToPromises(commands.commandExecuted, 2);
        simulate(node, 'click');
        await Promise.resolve();
        await Promise.resolve();
        await clickDialogButtonByText('Trust');
        const [, trustExecution] = await executions[0];

        expect(calls).toEqual(['trust']);
        expect(trustExecution.id).toBe(trustCommand);
        await expect(trustExecution.result).resolves.toEqual({
          trusted: false
        });
        expect(await isFulfilled(executions[1], 50)).toBe(false);

        document.body.removeChild(wrapper);
        linker.dispose();
        trustDisposable.dispose();
        disposable.dispose();
      });

      it('should not execute when trust command returns no result', async () => {
        const calls: string[] = [];
        const command = 'commandlinker:untrusted-trust-void';
        const trustCommand = 'commandlinker:trust-void';
        const commands = new CommandRegistry();
        const linker = new CommandLinker({ commands });
        const wrapper = document.createElement('div');
        const node = document.createElement('div');
        const disposable = commands.addCommand(command, {
          execute: () => {
            calls.push('command');
          }
        });
        const trustDisposable = commands.addCommand(trustCommand, {
          execute: () => {
            calls.push('trust');
          }
        });

        wrapper.setAttribute('data-trust-command', trustCommand);
        wrapper.appendChild(node);
        document.body.appendChild(wrapper);
        linker.connectNode(node, command, undefined);

        const executions = signalToPromises(commands.commandExecuted, 2);
        simulate(node, 'click');
        await Promise.resolve();
        await Promise.resolve();
        await clickDialogButtonByText('Trust');
        const [, trustExecution] = await executions[0];

        expect(calls).toEqual(['trust']);
        expect(trustExecution.id).toBe(trustCommand);
        await expect(trustExecution.result).resolves.toBeUndefined();
        expect(await isFulfilled(executions[1], 50)).toBe(false);

        document.body.removeChild(wrapper);
        linker.dispose();
        trustDisposable.dispose();
        disposable.dispose();
      });
    });
  });
});
