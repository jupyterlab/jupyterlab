// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Kernel, KernelMessage } from '../../src';
import { validateMessage, validateModel } from '../../src/kernel/validate';

describe('kernel/validate', () => {
  describe('validateMessage', () => {
    it('should pass a valid message', () => {
      const msg = KernelMessage.createMessage({
        msgType: 'comm_msg',
        channel: 'iopub',
        session: 'foo',
        content: { comm_id: 'foo', data: {} }
      });
      expect(() => {
        validateMessage(msg);
      }).not.toThrow();
    });

    it('should throw if missing a field', () => {
      const msg = KernelMessage.createMessage({
        msgType: 'comm_msg',
        channel: 'iopub',
        session: 'baz',
        content: { comm_id: 'foo', data: {} }
      });
      delete (msg as any).channel;
      expect(() => validateMessage(msg)).toThrow();
    });

    it('should throw if a field is invalid', () => {
      const msg = KernelMessage.createMessage({
        msgType: 'comm_msg',
        channel: 'iopub',
        session: 'baz',
        content: { comm_id: 'foo', data: {} }
      });
      (msg as any).header.username = 1;
      expect(() => validateMessage(msg)).toThrow();
    });

    it('should throw if the parent header is given an invalid', () => {
      const msg = KernelMessage.createMessage({
        msgType: 'comm_msg',
        channel: 'iopub',
        session: 'baz',
        content: { comm_id: 'foo', data: {} }
      });
      msg.parent_header = msg.header;
      (msg as any).parent_header.username = 1;
      expect(() => validateMessage(msg)).toThrow();
    });

    it('should throw if the channel is not a string', () => {
      const msg = KernelMessage.createMessage({
        msgType: 'comm_msg',
        channel: 'iopub',
        session: 'baz',
        content: { comm_id: 'foo', data: {} }
      });
      (msg as any).channel = 1;
      expect(() => validateMessage(msg)).toThrow();
    });

    it('should validate an iopub message', () => {
      const msg = KernelMessage.createMessage({
        msgType: 'comm_close',
        channel: 'iopub',
        session: 'baz',
        content: { comm_id: 'foo', data: {} }
      });
      expect(() => {
        validateMessage(msg);
      }).not.toThrow();
    });

    it('should ignore on an unknown iopub message type', () => {
      const msg = KernelMessage.createMessage({
        msgType: 'foo',
        channel: 'iopub',
        session: 'baz',
        content: {}
      } as any);
      expect(() => {
        validateMessage(msg);
      }).not.toThrow();
    });

    it('should throw on missing iopub message content', () => {
      const msg = KernelMessage.createMessage<KernelMessage.IErrorMsg>({
        msgType: 'error',
        channel: 'iopub',
        session: 'baz',
        content: {} as any
      } as any);
      expect(() => validateMessage(msg)).toThrow();
    });

    it('should throw on invalid iopub message content', () => {
      const msg = KernelMessage.createMessage<KernelMessage.IClearOutputMsg>({
        msgType: 'clear_output',
        channel: 'iopub',
        session: 'baz',
        content: { wait: 1 as any }
      });
      expect(() => validateMessage(msg)).toThrow();
    });

    it('should throw on invalid iopub status message content', () => {
      const msg = KernelMessage.createMessage<KernelMessage.IStatusMsg>({
        msgType: 'status',
        channel: 'iopub',
        session: 'baz',
        content: { execution_state: 'invalid-status' as Kernel.Status }
      });
      expect(() => validateMessage(msg)).toThrow();
    });

    it('should handle no buffers field', () => {
      const msg = KernelMessage.createMessage({
        msgType: 'comm_msg',
        channel: 'iopub',
        session: 'foo',
        content: { comm_id: 'foo', data: {} }
      });
      delete msg['buffers'];
      expect(() => {
        validateMessage(msg);
      }).not.toThrow();
    });
  });

  describe('#validateModel()', () => {
    it('should pass a valid id', () => {
      const id: Kernel.IModel = { name: 'foo', id: 'baz' };
      expect(() => {
        validateModel(id);
      }).not.toThrow();
    });
  });
});
