// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  KernelMessage
} from './messages';


/**
 * Deserialize and return the unpacked message.
 *
 * #### Notes
 * Handles JSON blob strings and binary messages.
 */
export
function deserialize(data: ArrayBuffer | string): KernelMessage.IMessage {
  let value: KernelMessage.IMessage;
  if (typeof data === 'string') {
    value = JSON.parse(data);
  } else {
    value = deserializeBinary(data);
  }
  return value;
}


/**
 * Serialize a kernel message for transport.
 *
 * #### Notes
 * If there is binary content, an `ArrayBuffer` is returned,
 * otherwise the message is converted to a JSON string.
 */
export
function serialize(msg: KernelMessage.IMessage): string | ArrayBuffer {
  let value: string | ArrayBuffer;
  if (msg.buffers && msg.buffers.length) {
    value = serializeBinary(msg);
  } else {
    value = JSON.stringify(msg);
  }
  return value;
}


/**
 * Deserialize a binary message to a Kernel Message.
 */
function deserializeBinary(buf: ArrayBuffer): KernelMessage.IMessage {
  let data = new DataView(buf);
  // read the header: 1 + nbufs 32b integers
  let nbufs = data.getUint32(0);
  let offsets: number[] = [];
  if (nbufs < 2) {
    throw new Error('Invalid incoming Kernel Message');
  }
  for (let i = 1; i <= nbufs; i++) {
    offsets.push(data.getUint32(i * 4));
  }
  let jsonBytes = new Uint8Array(buf.slice(offsets[0], offsets[1]));
  let msg = JSON.parse((new TextDecoder('utf8')).decode(jsonBytes));
  // the remaining chunks are stored as DataViews in msg.buffers
  msg.buffers = [];
  for (let i = 1; i < nbufs; i++) {
    let start = offsets[i];
    let stop = offsets[i + 1] || buf.byteLength;
    msg.buffers.push(new DataView(buf.slice(start, stop)));
  }
  return msg;
}


/**
 * Implement the binary serialization protocol.
 *
 * Serialize Kernel message to ArrayBuffer.
 */
function serializeBinary(msg: KernelMessage.IMessage): ArrayBuffer {
  let offsets: number[] = [];
  let buffers: ArrayBuffer[] = [];
  let encoder = new TextEncoder();
  let origBuffers: (ArrayBuffer | ArrayBufferView)[] = [];
  if (msg.buffers !== undefined) {
    origBuffers = msg.buffers;
    delete msg['buffers'];
  }
  let jsonUtf8 = encoder.encode(JSON.stringify(msg));
  buffers.push(jsonUtf8.buffer);
  for (let i = 0; i < origBuffers.length; i++) {
    // msg.buffers elements could be either views or ArrayBuffers
    // buffers elements are ArrayBuffers
    let b: any = origBuffers[i];
    buffers.push(b instanceof ArrayBuffer ? b : b.buffer);
  }
  let nbufs = buffers.length;
  offsets.push(4 * (nbufs + 1));
  for (let i = 0; i + 1 < buffers.length; i++) {
    offsets.push(offsets[offsets.length - 1] + buffers[i].byteLength);
  }
  let msgBuf = new Uint8Array(
    offsets[offsets.length - 1] + buffers[buffers.length - 1].byteLength
  );
  // use DataView.setUint32 for network byte-order
  let view = new DataView(msgBuf.buffer);
  // write nbufs to first 4 bytes
  view.setUint32(0, nbufs);
  // write offsets to next 4 * nbufs bytes
  for (let i = 0; i < offsets.length; i++) {
    view.setUint32(4 * (i + 1), offsets[i]);
  }
  // write all the buffers at their respective offsets
  for (let i = 0; i < buffers.length; i++) {
    msgBuf.set(new Uint8Array(buffers[i]), offsets[i]);
  }
  return msgBuf.buffer;
}
