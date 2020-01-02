// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { KernelMessage } from '@jupyterlab/services';

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
      let msg = KernelMessage.createMessage<KernelMessage.IStreamMsg>({
        msgType: 'stream',
        channel: 'iopub',
        session: 'baz',
        content: {
          name: 'stdout',
          text: 'hello world'
        }
      });
      expect(KernelMessage.isStreamMsg(msg)).to.equal(true);
      expect(KernelMessage.isStreamMsg(iopubStatusMsg)).to.equal(false);
    });
  });

  describe('KernelMessage.isDisplayDataMsg()', () => {
    it('should check for a display data message type', () => {
      let msg = KernelMessage.createMessage<KernelMessage.IDisplayDataMsg>({
        msgType: 'display_data',
        channel: 'iopub',
        session: 'baz',
        content: {
          data: {},
          metadata: {}
        }
      });
      expect(KernelMessage.isDisplayDataMsg(msg)).to.equal(true);
      expect(KernelMessage.isDisplayDataMsg(iopubStatusMsg)).to.equal(false);
    });
  });

  describe('KernelMessage.isExecuteInputMsg()', () => {
    it('should check for a execute input message type', () => {
      let msg = KernelMessage.createMessage<KernelMessage.IExecuteInputMsg>({
        msgType: 'execute_input',
        channel: 'iopub',
        session: 'baz',
        content: {
          code: '',
          execution_count: 1
        }
      });
      expect(KernelMessage.isExecuteInputMsg(msg)).to.equal(true);
      expect(KernelMessage.isExecuteInputMsg(iopubStatusMsg)).to.equal(false);
    });
  });

  describe('KernelMessage.isExecuteResultMsg()', () => {
    it('should check for an execute result message type', () => {
      let msg = KernelMessage.createMessage({
        msgType: 'execute_result',
        channel: 'iopub',
        session: 'baz',
        content: { data: {}, execution_count: 1, metadata: {} }
      });
      expect(KernelMessage.isExecuteResultMsg(msg)).to.equal(true);
      expect(KernelMessage.isExecuteResultMsg(iopubStatusMsg)).to.equal(false);
    });
  });

  describe('KernelMessage.isStatusMsg()', () => {
    it('should check for a status message type', () => {
      let msg = KernelMessage.createMessage({
        msgType: 'status',
        channel: 'iopub',
        session: 'baz',
        content: {
          execution_state: 'idle'
        }
      });
      expect(KernelMessage.isStatusMsg(msg)).to.equal(true);
      let msg2 = KernelMessage.createMessage<KernelMessage.IExecuteInputMsg>({
        msgType: 'execute_input',
        channel: 'iopub',
        session: 'baz',
        content: {
          code: '',
          execution_count: 1
        }
      });
      expect(KernelMessage.isStatusMsg(msg2)).to.equal(false);
    });
  });

  describe('KernelMessage.isClearOutputMsg()', () => {
    it('should check for a clear output message type', () => {
      let msg = KernelMessage.createMessage({
        msgType: 'clear_output',
        channel: 'iopub',
        session: 'baz',
        content: { wait: true }
      });
      expect(KernelMessage.isClearOutputMsg(msg)).to.equal(true);
      expect(KernelMessage.isClearOutputMsg(iopubStatusMsg)).to.equal(false);
    });
  });

  describe('KernelMessage.isCommOpenMsg()', () => {
    it('should check for a comm open message type', () => {
      let msg = KernelMessage.createMessage({
        msgType: 'comm_open',
        channel: 'iopub',
        session: 'baz',
        content: {
          comm_id: 'id',
          data: {},
          target_name: 'target'
        }
      });
      expect(KernelMessage.isCommOpenMsg(msg)).to.equal(true);
      expect(KernelMessage.isCommOpenMsg(iopubStatusMsg)).to.equal(false);
    });
  });

  describe('KernelMessage.isErrorMsg()', () => {
    it('should check for an message type', () => {
      let msg = KernelMessage.createMessage({
        msgType: 'error',
        channel: 'iopub',
        session: 'baz',
        content: {
          ename: '',
          evalue: '',
          traceback: []
        }
      });
      expect(KernelMessage.isErrorMsg(msg)).to.equal(true);
      expect(KernelMessage.isErrorMsg(iopubStatusMsg)).to.equal(false);
    });
  });

  describe('KernelMessage.isInputRequestMsg()', () => {
    it('should check for an input_request message type', () => {
      let msg = KernelMessage.createMessage({
        msgType: 'input_request',
        channel: 'stdin',
        session: 'baz',
        content: { prompt: '', password: false }
      });
      expect(KernelMessage.isInputRequestMsg(msg)).to.equal(true);
      let msg2 = KernelMessage.createMessage<KernelMessage.IInputReplyMsg>({
        msgType: 'input_reply',
        channel: 'stdin',
        session: 'baz',
        content: {
          status: 'ok',
          value: ''
        }
      });
      expect(KernelMessage.isInputRequestMsg(msg2)).to.equal(false);
    });
  });
});
