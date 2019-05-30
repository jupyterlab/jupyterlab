// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { JSONObject } from '@phosphor/coreutils';

import { Kernel, KernelMessage } from '@jupyterlab/services';

import {
  validateMessage,
  validateModel,
  validateSpecModel,
  validateSpecModels
} from '@jupyterlab/services/lib/kernel/validate';

import { PYTHON_SPEC } from '../utils';

describe('kernel/validate', () => {
  describe('validateMessage', () => {
    it('should pass a valid message', () => {
      const msg = KernelMessage.createMessage({
        msgType: 'comm_msg',
        channel: 'iopub',
        session: 'foo',
        content: { comm_id: 'foo', data: {} }
      });
      validateMessage(msg);
    });

    it('should throw if missing a field', () => {
      const msg = KernelMessage.createMessage({
        msgType: 'comm_msg',
        channel: 'iopub',
        session: 'baz',
        content: { comm_id: 'foo', data: {} }
      });
      delete msg.channel;
      expect(() => validateMessage(msg)).to.throw();
    });

    it('should throw if a field is invalid', () => {
      const msg = KernelMessage.createMessage({
        msgType: 'comm_msg',
        channel: 'iopub',
        session: 'baz',
        content: { comm_id: 'foo', data: {} }
      });
      (msg as any).header.username = 1;
      expect(() => validateMessage(msg)).to.throw();
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
      expect(() => validateMessage(msg)).to.throw();
    });

    it('should throw if the channel is not a string', () => {
      const msg = KernelMessage.createMessage({
        msgType: 'comm_msg',
        channel: 'iopub',
        session: 'baz',
        content: { comm_id: 'foo', data: {} }
      });
      (msg as any).channel = 1;
      expect(() => validateMessage(msg)).to.throw();
    });

    it('should validate an iopub message', () => {
      const msg = KernelMessage.createMessage({
        msgType: 'comm_close',
        channel: 'iopub',
        session: 'baz',
        content: { comm_id: 'foo', data: {} }
      });
      validateMessage(msg);
    });

    it('should ignore on an unknown iopub message type', () => {
      const msg = KernelMessage.createMessage({
        msgType: 'foo',
        channel: 'iopub',
        session: 'baz',
        content: {}
      } as any);
      validateMessage(msg);
    });

    it('should throw on missing iopub message content', () => {
      const msg = KernelMessage.createMessage<KernelMessage.IErrorMsg>({
        msgType: 'error',
        channel: 'iopub',
        session: 'baz',
        content: {} as any
      } as any);
      expect(() => validateMessage(msg)).to.throw();
    });

    it('should throw on invalid iopub message content', () => {
      const msg = KernelMessage.createMessage<KernelMessage.IClearOutputMsg>({
        msgType: 'clear_output',
        channel: 'iopub',
        session: 'baz',
        content: { wait: 1 as any }
      });
      expect(() => validateMessage(msg)).to.throw();
    });

    it('should handle no buffers field', () => {
      const msg = KernelMessage.createMessage({
        msgType: 'comm_msg',
        channel: 'iopub',
        session: 'foo',
        content: { comm_id: 'foo', data: {} }
      });
      delete msg['buffers'];
      validateMessage(msg);
    });
  });

  describe('#validateModel()', () => {
    it('should pass a valid id', () => {
      const id: Kernel.IModel = { name: 'foo', id: 'baz' };
      validateModel(id);
    });
  });

  describe('#validateSpecModel', () => {
    it('should pass with valid data', () => {
      validateSpecModel(PYTHON_SPEC);
    });

    it('should fail on missing data', () => {
      const spec = JSON.parse(JSON.stringify(PYTHON_SPEC));
      delete spec['name'];
      expect(() => validateSpecModel(spec)).to.throw();
    });

    it('should fail on incorrect data', () => {
      const spec = JSON.parse(JSON.stringify(PYTHON_SPEC));
      spec.spec.language = 1;
      expect(() => validateSpecModel(spec)).to.throw();
    });
  });

  describe('#validateSpecModel', () => {
    it('should pass with valid data', () => {
      const model: JSONObject = {
        default: 'python',
        kernelspecs: {
          python: PYTHON_SPEC
        }
      };
      validateSpecModels(model);
    });

    it('should fail on missing data', () => {
      const model: any = {
        default: 'python'
      };
      expect(() => validateSpecModels(model)).to.throw();
    });
  });
});
