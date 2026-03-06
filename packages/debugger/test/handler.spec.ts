// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  KernelMock,
  KernelSpecManagerMock,
  SessionConnectionMock
} from '@jupyterlab/services/lib/testutils';
import type { IEditorMimeTypeService } from '@jupyterlab/codeeditor';
import { Toolbar, type ToolbarButton } from '@jupyterlab/ui-components';
import { Debugger, DebuggerDisplayRegistry } from '../src';
import type { IDebugger } from '../src/tokens';
import type { DocumentWidget } from '@jupyterlab/docregistry';
import { Widget } from '@lumino/widgets';
import { MainAreaWidget } from '@jupyterlab/apputils';
import type { ILabShell } from '@jupyterlab/application';
import type { Session } from '@jupyterlab/services';

const DEBUGGER_ITEM_NAME = 'debugger-icon';
type ButtonCapture = {
  current: ToolbarButton | null;
  insertedEnabledStates: boolean[];
};

/**
 * Mock a session widget, capturing the debugger button instance once set.
 */
function mockSessionWidget(buttonCapture: ButtonCapture): DocumentWidget {
  const toolbar = new Toolbar<ToolbarButton>();
  jest
    .spyOn(toolbar, 'insertBefore')
    .mockImplementation((_at: string, name: string, widget: ToolbarButton) => {
      if (name === DEBUGGER_ITEM_NAME) {
        buttonCapture.current = widget;
      }
      return false;
    });
  jest
    .spyOn(toolbar, 'addItem')
    .mockImplementation((name: string, widget: ToolbarButton) => {
      if (name === DEBUGGER_ITEM_NAME) {
        buttonCapture.current = widget;
        buttonCapture.insertedEnabledStates.push(widget.enabled);
      }
      return true;
    });
  return new MainAreaWidget({
    content: new Widget(),
    toolbar: toolbar
  }) as DocumentWidget;
}

/**
 * Create a minimal mock IDebugger for testing.
 */
function createMockDebugger(isAvailableResult: boolean): IDebugger {
  const service = new Debugger.Service({
    displayRegistry: new DebuggerDisplayRegistry(),
    specsManager: new KernelSpecManagerMock(),
    config: new Debugger.Config(),
    mimeTypeService: createDummyMimeTypeService()
  });
  jest.spyOn(service, 'isAvailable').mockResolvedValue(isAvailableResult);
  jest.spyOn(service, 'restoreState').mockResolvedValue(undefined);
  return service;
}

describe('DebuggerHandler', () => {
  describe('#updateWidget', () => {
    // Tests for DebuggerHandler toolbar button state, see #18514 - icon flicker

    let buttonCapture: ButtonCapture;
    let widget: DocumentWidget;
    let connection: Session.ISessionConnection;
    let service: IDebugger;

    beforeEach(() => {
      buttonCapture = { current: null, insertedEnabledStates: [] };
      widget = mockSessionWidget(buttonCapture);
      const kernel = new KernelMock({});
      kernel.requestDebug = jest.fn().mockResolvedValue({});
      connection = new SessionConnectionMock({}, kernel);
    });

    it('should add debugger button as enabled when kernel supports debugging', async () => {
      service = createMockDebugger(true);

      const handler = new Debugger.Handler({
        type: 'notebook',
        shell: { currentWidget: widget } as unknown as ILabShell,
        service
      });

      await handler.updateWidget(widget, connection);

      expect(buttonCapture.current).not.toBeNull();
      expect(buttonCapture.current!.enabled).toBe(true);
      expect(buttonCapture.insertedEnabledStates).toEqual([true]);
    });

    it('should add debugger button as disabled when kernel does not support debugging', async () => {
      service = createMockDebugger(false);

      const handler = new Debugger.Handler({
        type: 'notebook',
        shell: { currentWidget: widget } as unknown as ILabShell,
        service
      });

      await handler.updateWidget(widget, connection);

      expect(buttonCapture.current).not.toBeNull();
      expect(buttonCapture.current!.enabled).toBe(false);
      expect(buttonCapture.insertedEnabledStates).toEqual([false]);
    });

    it('should not add debugger button before a kernel exists', async () => {
      service = createMockDebugger(true);
      const noKernelConnection = {
        ...connection,
        kernel: null
      } as Session.ISessionConnection;

      const handler = new Debugger.Handler({
        type: 'notebook',
        shell: { currentWidget: widget } as unknown as ILabShell,
        service
      });

      await handler.updateWidget(widget, noKernelConnection);

      expect(service.isAvailable).not.toHaveBeenCalled();
      expect(buttonCapture.current).toBeNull();
      expect(buttonCapture.insertedEnabledStates).toHaveLength(0);

      await handler.updateWidget(widget, connection);

      expect(service.isAvailable).toHaveBeenCalledWith(connection);
      expect(buttonCapture.current).not.toBeNull();
      expect(buttonCapture.current!.enabled).toBe(true);
      expect(buttonCapture.insertedEnabledStates).toEqual([true]);
    });
  });
});

/**
 * A minimal dummy mime type service for testing.
 */
function createDummyMimeTypeService(): IEditorMimeTypeService {
  return {
    getMimeTypeByFilePath: jest.fn().mockReturnValue('text/plain'),
    getMimeTypeByLanguage: jest.fn().mockReturnValue('text/plain')
  };
}
