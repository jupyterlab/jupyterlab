// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
//
// Tests for DebuggerHandler toolbar button state (fixes #18514 - icon flicker).
// Mocks ../src/debugger to avoid circular import (debugger.ts imports handler.ts).
// Run: cd packages/debugger && ../../node_modules/.bin/jest --testPathPattern=handler.spec -i

jest.mock('../src/debugger', () => ({
  Debugger: { Session: class {} }
}));

import type { Session } from '@jupyterlab/services';
import { Signal } from '@lumino/signaling';
import { UUID } from '@lumino/coreutils';
import type { ToolbarButton } from '@jupyterlab/ui-components';
import { DebuggerHandler } from '../src/handler';
import type { IDebugger } from '../src/tokens';

const DEBUGGER_ITEM_NAME = 'debugger-icon';

function createMockConnection(): Session.ISessionConnection {
  return {
    id: UUID.uuid4(),
    path: '/test/path',
    kernel: null,
    type: 'test',
    name: 'test',
    model: { id: UUID.uuid4(), name: '', path: '', type: 'test' },
    kernelChanged: new Signal({} as any),
    statusChanged: new Signal({} as any),
    connectionStatusChanged: new Signal({} as any),
    iopubMessage: new Signal({} as any),
    unhandledMessage: new Signal({} as any),
    anyMessage: new Signal({} as any),
    dispose: () => undefined,
    isDisposed: false,
    changeKernel: async () => undefined,
    shutdown: async () => undefined
  } as unknown as Session.ISessionConnection;
}

function createMockWidget(buttonCapture: { current: ToolbarButton | null }) {
  const disposed = new Signal<unknown, void>({ id: 'widget-1' });
  const toolbar = {
    insertBefore: (_at: string, name: string, widget: ToolbarButton): boolean => {
      if (name === DEBUGGER_ITEM_NAME) {
        buttonCapture.current = widget;
      }
      return false;
    },
    addItem: (name: string, widget: ToolbarButton): boolean => {
      if (name === DEBUGGER_ITEM_NAME) {
        buttonCapture.current = widget;
      }
      return true;
    }
  };
  const node = document.createElement('div');
  return {
    id: 'test-widget-1',
    toolbar,
    node,
    disposed
  };
}

function createMockService(
  isAvailableResult: boolean,
  options: { withSession?: boolean } = {}
): IDebugger {
  const connection = createMockConnection();
  const stopped = new Signal<IDebugger, void>({} as IDebugger);
  const session = options.withSession
    ? ({
        connection: { ...connection },
        capabilities: { supportsModulesRequest: false }
      } as unknown as IDebugger.ISession)
    : null;

  return {
    model: { clear: () => undefined },
    config: {},
    isAvailable: jest.fn().mockResolvedValue(isAvailableResult),
    get isStarted(): boolean {
      return false;
    },
    get session(): IDebugger.ISession | null {
      return session;
    },
    set session(_s: IDebugger.ISession | null) {
      // no-op for mock
    },
    restoreState: jest.fn().mockResolvedValue(undefined),
    displayDefinedVariables: jest.fn().mockResolvedValue(undefined),
    displayModules: jest.fn().mockResolvedValue(undefined),
    stopped,
    hasStoppedThreads: () => false
  } as unknown as IDebugger;
}

describe('DebuggerHandler', () => {
  describe('#updateWidget toolbar button state', () => {
    it('should add debugger button as enabled when kernel supports debugging', async () => {
      const buttonCapture: { current: ToolbarButton | null } = { current: null };
      const widget = createMockWidget(buttonCapture);
      const connection = createMockConnection();
      const service = createMockService(true, { withSession: true });

      const handler = new DebuggerHandler({
        type: 'notebook',
        shell: { currentWidget: widget },
        service
      } as unknown as DebuggerHandler.IOptions);

      await handler.updateWidget(widget as any, connection);

      expect(buttonCapture.current).not.toBeNull();
      expect(buttonCapture.current!.enabled).toBe(true);
    });

    it('should add debugger button as disabled when kernel does not support debugging', async () => {
      const buttonCapture: { current: ToolbarButton | null } = { current: null };
      const widget = createMockWidget(buttonCapture);
      const connection = createMockConnection();
      const service = createMockService(false);

      const handler = new DebuggerHandler({
        type: 'notebook',
        shell: { currentWidget: widget },
        service
      } as unknown as DebuggerHandler.IOptions);

      await handler.updateWidget(widget as any, connection);

      expect(buttonCapture.current).not.toBeNull();
      expect(buttonCapture.current!.enabled).toBe(false);
    });

    it('should resolve isAvailable before showing button (no disabled-then-enabled flicker)', async () => {
      const buttonCapture: { current: ToolbarButton | null } = { current: null };
      const widget = createMockWidget(buttonCapture);
      const connection = createMockConnection();
      const service = createMockService(true, { withSession: true });

      const handler = new DebuggerHandler({
        type: 'notebook',
        shell: { currentWidget: widget },
        service
      } as unknown as DebuggerHandler.IOptions);

      await handler.updateWidget(widget as any, connection);

      expect(service.isAvailable).toHaveBeenCalledWith(connection);
      expect(buttonCapture.current!.enabled).toBe(true);
    });
  });
});
