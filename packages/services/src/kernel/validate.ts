// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as KernelMessage from './messages';

import { IModel } from './restapi';

import { validateProperty } from '../validate';

/**
 * Required fields for `IKernelHeader`.
 */
const HEADER_FIELDS = ['username', 'version', 'session', 'msg_id', 'msg_type'];

/**
 * Required fields and types for contents of various types of `kernel.IMessage`
 * messages on the iopub channel.
 */
const IOPUB_CONTENT_FIELDS: { [key: string]: any } = {
  stream: { name: 'string', text: 'string' },
  display_data: { data: 'object', metadata: 'object' },
  execute_input: { code: 'string', execution_count: 'number' },
  execute_result: {
    execution_count: 'number',
    data: 'object',
    metadata: 'object'
  },
  error: { ename: 'string', evalue: 'string', traceback: 'object' },
  status: {
    execution_state: [
      'string',
      ['starting', 'idle', 'busy', 'restarting', 'dead']
    ]
  },
  clear_output: { wait: 'boolean' },
  comm_open: { comm_id: 'string', target_name: 'string', data: 'object' },
  comm_msg: { comm_id: 'string', data: 'object' },
  comm_close: { comm_id: 'string' },
  shutdown_reply: { restart: 'boolean' } // Emitted by the IPython kernel.
};

/**
 * Validate the header of a kernel message.
 */
function validateHeader(
  header: KernelMessage.IHeader
): asserts header is KernelMessage.IHeader {
  for (let i = 0; i < HEADER_FIELDS.length; i++) {
    validateProperty(header, HEADER_FIELDS[i], 'string');
  }
}

/**
 * Validate a kernel message object.
 */
export function validateMessage(
  msg: KernelMessage.IMessage
): asserts msg is KernelMessage.IMessage {
  validateProperty(msg, 'metadata', 'object');
  validateProperty(msg, 'content', 'object');
  validateProperty(msg, 'channel', 'string');
  validateHeader(msg.header);
  if (msg.channel === 'iopub') {
    validateIOPubContent(msg as KernelMessage.IIOPubMessage);
  }
}

/**
 * Validate content an kernel message on the iopub channel.
 */
function validateIOPubContent(
  msg: KernelMessage.IIOPubMessage
): asserts msg is KernelMessage.IIOPubMessage {
  if (msg.channel === 'iopub') {
    const fields = IOPUB_CONTENT_FIELDS[msg.header.msg_type];
    // Check for unknown message type.
    if (fields === undefined) {
      return;
    }
    const names = Object.keys(fields);
    const content = msg.content;
    for (let i = 0; i < names.length; i++) {
      let args = fields[names[i]];
      if (!Array.isArray(args)) {
        args = [args];
      }
      validateProperty(content, names[i], ...args);
    }
  }
}

/**
 * Validate a `Kernel.IModel` object.
 */
export function validateModel(model: IModel): asserts model is IModel {
  validateProperty(model, 'name', 'string');
  validateProperty(model, 'id', 'string');
}

/**
 * Validate an array of `IModel` objects.
 */
export function validateModels(models: IModel[]): asserts models is IModel[] {
  if (!Array.isArray(models)) {
    throw new Error('Invalid kernel list');
  }
  models.forEach(d => validateModel(d));
}
