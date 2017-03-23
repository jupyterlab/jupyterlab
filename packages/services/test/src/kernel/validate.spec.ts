// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Kernel, KernelMessage
} from '../../../lib/kernel';

import {
  validateMessage, validateModel, validateSpecModel, validateSpecModels
} from '../../../lib/kernel/validate';

import {
  PYTHON_SPEC
} from '../utils';


describe('kernel/validate', () => {

  describe('validateMessage', () => {

    it('should pass a valid message', () => {
      let msg = KernelMessage.createMessage({
        msgType: 'comm_msg', channel: 'iopub', session: 'foo'
      }, { comm_id: 'foo', data: {} });
      validateMessage(msg);
    });

    it('should throw if missing a field', () => {
      let msg = KernelMessage.createMessage({
        msgType: 'comm_msg', channel: 'iopub', session: 'baz'
      });
      delete msg.channel;
      expect(() => validateMessage(msg)).to.throwError();
    });

    it('should throw if a field is invalid', () => {
      let msg = KernelMessage.createMessage({
        msgType: 'comm_msg', channel: 'iopub', session: 'baz'
      });
      (msg as any).header.username = 1;
      expect(() => validateMessage(msg)).to.throwError();
    });

    it('should throw if the parent header is given an invalid', () => {
      let msg = KernelMessage.createMessage({
        msgType: 'comm_msg', channel: 'iopub', session: 'baz'
      });
      msg.parent_header = msg.header;
      (msg as any).parent_header.username = 1;
      expect(() => validateMessage(msg)).to.throwError();
    });

    it('should throw if the channel is not a string', () => {
      let msg = KernelMessage.createMessage({
        msgType: 'comm_msg', channel: 'iopub', session: 'baz'
      });
      (msg as any).channel = 1;
      expect(() => validateMessage(msg)).to.throwError();
    });

    it('should validate an iopub message', () => {
      let msg = KernelMessage.createMessage({
        msgType: 'comm_close', channel: 'iopub', session: 'baz'
      }, { comm_id: 'foo' });
      validateMessage(msg);
    });

    it('should ignore on an unknown iopub message type', () => {
      let msg = KernelMessage.createMessage({
        msgType: 'foo', channel: 'iopub', session: 'baz'
      }, { });
      validateMessage(msg);
    });

    it('should throw on missing iopub message content', () => {
      let msg = KernelMessage.createMessage({
        msgType: 'error', channel: 'iopub', session: 'baz'
      }, { });
      expect(() => validateMessage(msg)).to.throwError();
    });

    it('should throw on invalid iopub message content', () => {
      let msg = KernelMessage.createMessage({
        msgType: 'clear_output', channel: 'iopub', session: 'baz'
      }, { wait: 1 });
      expect(() => validateMessage(msg)).to.throwError();
    });

  });

  describe('#validateModel()', () => {

    it('should pass a valid id', () => {
      let id: Kernel.IModel = { name: 'foo', id: 'baz' };
      validateModel(id);
    });

    it('should fail on missing data', () => {
      expect(() => validateModel({ name: 'foo' })).to.throwError();
      expect(() => validateModel({ id: 'foo' })).to.throwError();
    });

  });

  describe('#validateSpecModel', () => {

    it('should pass with valid data', () => {
      validateSpecModel(PYTHON_SPEC);
    });

    it('should fail on missing data', () => {
      let spec = JSON.parse(JSON.stringify(PYTHON_SPEC));
      delete spec['name'];
      expect(() => validateSpecModel(spec)).to.throwError();
    });

    it('should fail on incorrect data', () => {
      let spec = JSON.parse(JSON.stringify(PYTHON_SPEC));
      spec.spec.language = 1;
      expect(() => validateSpecModel(spec)).to.throwError();
    });

  });

  describe('#validateSpecModel', () => {

    it('should pass with valid data', () => {
      const model: Kernel.ISpecModels = {
        default: 'python',
        kernelspecs: {
          python: PYTHON_SPEC
        }
      };
      validateSpecModels(model);
    });

    it('should fail on missing data', () => {
      const model: any = {
        default: 'python',
      };
      expect(() => validateSpecModels(model)).to.throwError();
    });

  });

});
