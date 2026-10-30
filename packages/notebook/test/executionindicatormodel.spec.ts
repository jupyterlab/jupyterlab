// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ISessionContext } from '@jupyterlab/apputils';
import { ExecutionIndicator } from '@jupyterlab/notebook';
import type { Notebook } from '@jupyterlab/notebook';
import type { Kernel, KernelMessage } from '@jupyterlab/services';
import { Signal } from '@lumino/signaling';

/**
 * The parts of a kernel connection the execution indicator listens to.
 *
 * A live kernel cannot produce the case these tests cover: ipykernel publishes
 * an idle status for aborted requests, so the messages are driven by hand.
 */
class KernelStub {
  readonly anyMessage = new Signal<KernelStub, Kernel.IAnyMessageArgs>(this);
  readonly disposed = new Signal<KernelStub, void>(this);
}

/**
 * The parts of a session context the execution indicator listens to.
 */
class SessionContextStub {
  readonly statusChanged = new Signal<SessionContextStub, Kernel.Status>(this);
  readonly connectionStatusChanged = new Signal<
    SessionContextStub,
    Kernel.ConnectionStatus
  >(this);
  readonly kernelChanged = new Signal<SessionContextStub, unknown>(this);
  readonly disposed = new Signal<SessionContextStub, void>(this);
  readonly kernelDisplayStatus = 'idle';
  readonly session = { kernel: new KernelStub() };
}

function message(
  msgType: string,
  msgId: string,
  parentId: string | null
): KernelMessage.IMessage {
  return {
    header: {
      msg_id: msgId,
      msg_type: msgType,
      username: 'test',
      session: 'test-session',
      date: new Date().toISOString(),
      version: '5.3'
    },
    parent_header: parentId ? { msg_id: parentId } : {},
    metadata: {},
    content: {},
    channel: 'shell'
  } as unknown as KernelMessage.IMessage;
}

function statusMessage(
  parentId: string,
  state: string
): KernelMessage.IMessage {
  const msg = message('status', `${parentId}-status`, parentId);
  (msg as unknown as { content: Record<string, string> }).content = {
    execution_state: state
  };
  (msg as unknown as { channel: string }).channel = 'iopub';
  return msg;
}

describe('@jupyterlab/notebook', () => {
  describe('ExecutionIndicator.Model', () => {
    let model: ExecutionIndicator.Model;
    let context: SessionContextStub;
    let notebook: Notebook;

    beforeEach(() => {
      model = new ExecutionIndicator.Model();
      context = new SessionContextStub();
      notebook = {} as Notebook;
      model.attachNotebook({
        content: notebook,
        context: context as unknown as ISessionContext
      });
    });

    afterEach(() => {
      model.dispose();
    });

    const send = (msg: KernelMessage.IMessage, direction: 'send' | 'recv') => {
      context.session.kernel.anyMessage.emit({
        msg,
        direction
      } as Kernel.IAnyMessageArgs);
    };

    const scheduled = () => model.executionState(notebook)!.scheduledCell;

    it('should track a scheduled cell until it completes', () => {
      send(message('execute_request', 'request-1', null), 'send');

      expect(scheduled().size).toBe(1);
    });

    it('should complete a cell on the idle status', () => {
      send(message('execute_request', 'request-1', null), 'send');
      send(statusMessage('request-1', 'idle'), 'recv');

      expect(scheduled().size).toBe(0);
    });

    it('should complete a cell on the reply when no idle status follows', () => {
      // Kernels may answer an aborted request with a reply only: IRkernel sends
      // no idle status for the requests it drains after an execution error.
      send(message('execute_request', 'request-1', null), 'send');
      send(message('execute_reply', 'reply-1', 'request-1'), 'recv');

      expect(scheduled().size).toBe(0);
    });

    it('should leave the other cells scheduled when one is aborted', () => {
      send(message('execute_request', 'request-1', null), 'send');
      send(message('execute_request', 'request-2', null), 'send');
      send(message('execute_reply', 'reply-1', 'request-1'), 'recv');

      expect(scheduled().size).toBe(1);
      expect(scheduled().has('request-2')).toBe(true);
    });

    it('should count a cell once when both a reply and an idle status arrive', () => {
      send(message('execute_request', 'request-1', null), 'send');
      send(message('execute_reply', 'reply-1', 'request-1'), 'recv');
      send(statusMessage('request-1', 'idle'), 'recv');

      expect(scheduled().size).toBe(0);
      expect(model.executionState(notebook)!.scheduledCellNumber).toBe(1);
    });
  });
});
