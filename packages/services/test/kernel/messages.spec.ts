// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { KernelMessage } from '../../src';

describe('kernel/messages', () => {
  const iopubStatusMsg = KernelMessage.createMessage({
    msgType: 'status',
    channel: 'iopub',
    session: 'baz',
    content: {
      execution_state: 'idle'
    }
  });

  describe('KernelMessage.isStreamMsg()', () => {
    it('should check for a stream message type', () => {
      const msg = KernelMessage.createMessage<KernelMessage.IStreamMsg>({
        msgType: 'stream',
        channel: 'iopub',
        session: 'baz',
        content: {
          name: 'stdout',
          text: 'hello world'
        }
      });
      expect(KernelMessage.isStreamMsg(msg)).toBe(true);
      expect(KernelMessage.isStreamMsg(iopubStatusMsg)).toBe(false);
    });
  });

  describe('KernelMessage.isDisplayDataMsg()', () => {
    it('should check for a display data message type', () => {
      const msg = KernelMessage.createMessage<KernelMessage.IDisplayDataMsg>({
        msgType: 'display_data',
        channel: 'iopub',
        session: 'baz',
        content: {
          data: {},
          metadata: {}
        }
      });
      expect(KernelMessage.isDisplayDataMsg(msg)).toBe(true);
      expect(KernelMessage.isDisplayDataMsg(iopubStatusMsg)).toBe(false);
    });
  });

  describe('KernelMessage.isExecuteInputMsg()', () => {
    it('should check for a execute input message type', () => {
      const msg = KernelMessage.createMessage<KernelMessage.IExecuteInputMsg>({
        msgType: 'execute_input',
        channel: 'iopub',
        session: 'baz',
        content: {
          code: '',
          execution_count: 1
        }
      });
      expect(KernelMessage.isExecuteInputMsg(msg)).toBe(true);
      expect(KernelMessage.isExecuteInputMsg(iopubStatusMsg)).toBe(false);
    });
  });

  describe('KernelMessage.isExecuteResultMsg()', () => {
    it('should check for an execute result message type', () => {
      const msg = KernelMessage.createMessage({
        msgType: 'execute_result',
        channel: 'iopub',
        session: 'baz',
        content: { data: {}, execution_count: 1, metadata: {} }
      });
      expect(KernelMessage.isExecuteResultMsg(msg)).toBe(true);
      expect(KernelMessage.isExecuteResultMsg(iopubStatusMsg)).toBe(false);
    });
  });

  describe('KernelMessage.isStatusMsg()', () => {
    it('should check for a status message type', () => {
      const msg = KernelMessage.createMessage({
        msgType: 'status',
        channel: 'iopub',
        session: 'baz',
        content: {
          execution_state: 'idle'
        }
      });
      expect(KernelMessage.isStatusMsg(msg)).toBe(true);
      const msg2 = KernelMessage.createMessage<KernelMessage.IExecuteInputMsg>({
        msgType: 'execute_input',
        channel: 'iopub',
        session: 'baz',
        content: {
          code: '',
          execution_count: 1
        }
      });
      expect(KernelMessage.isStatusMsg(msg2)).toBe(false);
    });
  });

  describe('KernelMessage.isClearOutputMsg()', () => {
    it('should check for a clear output message type', () => {
      const msg = KernelMessage.createMessage({
        msgType: 'clear_output',
        channel: 'iopub',
        session: 'baz',
        content: { wait: true }
      });
      expect(KernelMessage.isClearOutputMsg(msg)).toBe(true);
      expect(KernelMessage.isClearOutputMsg(iopubStatusMsg)).toBe(false);
    });
  });

  describe('KernelMessage.isCommOpenMsg()', () => {
    it('should check for a comm open message type', () => {
      const msg = KernelMessage.createMessage({
        msgType: 'comm_open',
        channel: 'iopub',
        session: 'baz',
        content: {
          comm_id: 'id',
          data: {},
          target_name: 'target'
        }
      });
      expect(KernelMessage.isCommOpenMsg(msg)).toBe(true);
      expect(KernelMessage.isCommOpenMsg(iopubStatusMsg)).toBe(false);
    });
  });

  describe('KernelMessage.isErrorMsg()', () => {
    it('should check for an message type', () => {
      const msg = KernelMessage.createMessage({
        msgType: 'error',
        channel: 'iopub',
        session: 'baz',
        content: {
          ename: '',
          evalue: '',
          traceback: []
        }
      });
      expect(KernelMessage.isErrorMsg(msg)).toBe(true);
      expect(KernelMessage.isErrorMsg(iopubStatusMsg)).toBe(false);
    });
  });

  describe('KernelMessage.isInputRequestMsg()', () => {
    it('should check for an input_request message type', () => {
      const msg = KernelMessage.createMessage({
        msgType: 'input_request',
        channel: 'stdin',
        session: 'baz',
        content: { prompt: '', password: false }
      });
      expect(KernelMessage.isInputRequestMsg(msg)).toBe(true);
      const msg2 = KernelMessage.createMessage<KernelMessage.IInputReplyMsg>({
        msgType: 'input_reply',
        channel: 'stdin',
        session: 'baz',
        content: {
          status: 'ok',
          value: ''
        }
      });
      expect(KernelMessage.isInputRequestMsg(msg2)).toBe(false);
    });
  });
});
