// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel
} from './kernel';

import {
  KernelMessage
} from './messages';


/**
 * Required fields for `IKernelHeader`.
 */
const HEADER_FIELDS = ['username', 'version', 'session', 'msg_id', 'msg_type'];

/**
 * Requred fields and types for contents of various types of `kernel.IMessage`
 * messages on the iopub channel.
 */
const IOPUB_CONTENT_FIELDS: {[key: string]: any} = {
  stream: { name: 'string', text: 'string' },
  display_data: { data: 'object', metadata: 'object' },
  execute_input: { code: 'string', execution_count: 'number' },
  execute_result: { execution_count: 'number', data: 'object',
                    metadata: 'object' },
  error: { ename: 'string', evalue: 'string', traceback: 'object' },
  status: { execution_state: 'string' },
  clear_output: { wait: 'boolean' },
  comm_open: { comm_id: 'string', target_name: 'string', data: 'object' },
  comm_msg: { comm_id: 'string', data: 'object' },
  comm_close: { comm_id: 'string' },
  shutdown_reply: { restart : 'boolean' }  // Emitted by the IPython kernel.
};


/**
 * Validate a property as being on an object, and optionally
 * of a given type.
 */
function validateProperty(object: any, name: string, typeName?: string): void {
  if (!object.hasOwnProperty(name)) {
    throw Error(`Missing property '${name}'`);
  }
  if (typeName !== void 0) {
    let valid = true;
    let value = object[name];
    switch (typeName) {
    case 'array':
      valid = Array.isArray(value);
      break;
    case 'object':
      valid = typeof value !== 'undefined';
      break;
    default:
      valid = typeof value === typeName;
    }
    if (!valid) {
      throw new Error(`Property '${name}' is not of type '${typeName}`);
    }
  }
}


/**
 * Validate the header of a kernel message.
 */
function validateHeader(header: KernelMessage.IHeader): void {
  for (let i = 0; i < HEADER_FIELDS.length; i++) {
    validateProperty(header, HEADER_FIELDS[i], 'string');
  }
}


/**
 * Validate a kernel message object.
 */
export
function validateMessage(msg: KernelMessage.IMessage) : void {
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
function validateIOPubContent(msg: KernelMessage.IIOPubMessage) : void {
  if (msg.channel === 'iopub') {
    let fields = IOPUB_CONTENT_FIELDS[msg.header.msg_type];
    // Check for unknown message type.
    if (fields === void 0) {
      return;
    }
    let names = Object.keys(fields);
    let content = msg.content;
    for (let i = 0; i < names.length; i++) {
      validateProperty(content, names[i], fields[names[i]]);
    }
  }
}


/**
 * Validate a `Kernel.IModel` object.
 */
export
function validateModel(model: Kernel.IModel) : void {
  validateProperty(model, 'name', 'string');
  validateProperty(model, 'id', 'string');
}


/**
 * Validate a server kernelspec model to a client side model.
 */
export
function validateSpecModel(data: any): Kernel.ISpecModel {
  let spec = data.spec;
  if (!spec) {
    throw new Error('Invalid kernel spec');
  }
  validateProperty(data, 'name', 'string');
  validateProperty(data, 'resources', 'object');
  validateProperty(spec, 'language', 'string');
  validateProperty(spec, 'display_name', 'string');
  validateProperty(spec, 'argv', 'array');
  return {
    name: data.name,
    resources: data.resources,
    language: spec.language,
    display_name: spec.display_name,
    argv: spec.argv
  };
}

/**
 * Validate a `Kernel.ISpecModels` object.
 */
export
function validateSpecModels(data: any): Kernel.ISpecModels {
  if (!data.hasOwnProperty('kernelspecs')) {
    throw new Error('No kernelspecs found');
  }
  let keys = Object.keys(data.kernelspecs);
  let kernelspecs: { [key: string]: Kernel.ISpecModel } = Object.create(null);
  let defaultSpec = data.default;

  for (let i = 0; i < keys.length; i++) {
    let ks = data.kernelspecs[keys[i]];
    try {
      kernelspecs[keys[i]] = validateSpecModel(ks);
    } catch (err) {
      // Remove the errant kernel spec.
      console.warn(`Removing errant kernel spec: ${keys[i]}`);
    }
  }
  keys = Object.keys(kernelspecs);
  if (!keys.length) {
    throw new Error('No valid kernelspecs found');
  }
  if (!defaultSpec || typeof defaultSpec !== 'string' ||
      !(defaultSpec in kernelspecs)) {
    defaultSpec = keys[0];
    console.warn(`Default kernel not found, using '${keys[0]}'`);
  }
  return {
    default: defaultSpec,
    kernelspecs,
  };
}
