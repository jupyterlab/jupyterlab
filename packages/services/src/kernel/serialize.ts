// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as KernelMessage from './messages';

/**
 * Serialize a kernel message for transport.
 */
export function serialize(
  msg: KernelMessage.IMessage,
  protocol: string = ''
): string | ArrayBuffer {
  switch (protocol) {
    case 'v1.kernel.websocket.jupyter.org':
      return serialize_v1_kernel_websocket_jupyter_org(msg);
    default:
      return serialize_default(msg);
  }
}

/**
 * Deserialize and return the unpacked message.
 */
export function deserialize(
  data: ArrayBuffer,
  protocol: string = ''
): KernelMessage.IMessage {
  switch (protocol) {
    case 'v1.kernel.websocket.jupyter.org':
      return deserialize_v1_kernel_websocket_jupyter_org(data);
    default:
      return deserialize_default(data);
  }
}

/**
 * Deserialize and return the unpacked message.
 * Protocol v1.kernel.websocket.jupyter.org
 */
function deserialize_v1_kernel_websocket_jupyter_org(
  binMsg: ArrayBuffer
): KernelMessage.IMessage {
  let msg: KernelMessage.IMessage;
  const data = new DataView(binMsg);
  const offsetNumber = data.getUint32(0, true /* littleEndian */);
  let offsets: number[] = [];
  for (let i = 0; i < offsetNumber; i++) {
    offsets.push(data.getUint32(4 * (i + 1), true /* littleEndian */));
  }
  const decoder = new TextDecoder('utf8');
  const channel = decoder.decode(
    binMsg.slice(offsets[0], offsets[1])
  ) as KernelMessage.Channel;
  const header = JSON.parse(
    decoder.decode(binMsg.slice(offsets[1], offsets[2]))
  );
  const parent_header = JSON.parse(
    decoder.decode(binMsg.slice(offsets[2], offsets[3]))
  );
  const metadata = JSON.parse(
    decoder.decode(binMsg.slice(offsets[3], offsets[4]))
  );
  const content = JSON.parse(
    decoder.decode(binMsg.slice(offsets[4], offsets[5]))
  );
  let buffers = [];
  for (let i = 5; i < offsets.length; i++) {
    if (i == offsets.length - 1) {
      buffers.push(binMsg.slice(offsets[i]));
    } else {
      buffers.push(binMsg.slice(offsets[i], offsets[i + 1]));
    }
  }
  msg = {
    channel,
    header,
    parent_header,
    metadata,
    content,
    buffers
  };
  return msg;
}

/**
 * Serialize a kernel message for transport.
 * Protocol v1.kernel.websocket.jupyter.org
 */
function serialize_v1_kernel_websocket_jupyter_org(
  msg: KernelMessage.IMessage
): ArrayBuffer {
  const header = JSON.stringify(msg.header);
  const parent_header = JSON.stringify(msg.parent_header);
  const metadata = JSON.stringify(msg.metadata);
  const content = JSON.stringify(msg.content);
  const buffers: (ArrayBuffer | ArrayBufferView)[] =
    msg.buffers !== undefined ? msg.buffers : [];
  const offsetNumber = 1 + 4 + buffers.length + 1;
  let offsets: number[] = [];
  offsets.push(4 * (1 + offsetNumber));
  offsets.push(msg.channel.length + offsets[offsets.length - 1]);
  for (let length of [
    header.length,
    parent_header.length,
    metadata.length,
    content.length
  ]) {
    offsets.push(length + offsets[offsets.length - 1]);
  }
  let buffersByteLength = 0;
  for (let buffer of buffers) {
    let length = buffer.byteLength;
    offsets.push(length + offsets[offsets.length - 1]);
    buffersByteLength += length;
  }
  const encoder = new TextEncoder();
  const binMsgNoBuff = encoder.encode(
    msg.channel + header + parent_header + metadata + content
  );
  const binMsg = new Uint8Array(
    4 * (1 + offsetNumber) + binMsgNoBuff.byteLength + buffersByteLength
  );
  const word = new ArrayBuffer(4);
  const data = new DataView(word);
  data.setInt32(0, offsetNumber, true /* littleEndian */);
  binMsg.set(new Uint8Array(word), 0);
  for (let i = 0; i < offsets.length; i++) {
    data.setInt32(0, offsets[i], true /* littleEndian */);
    binMsg.set(new Uint8Array(word), 4 * (i + 1));
  }
  binMsg.set(binMsgNoBuff, offsets[0]);
  for (let i = 0; i < buffers.length; i++) {
    const buffer = buffers[i];
    binMsg.set(
      new Uint8Array(ArrayBuffer.isView(buffer) ? buffer.buffer : buffer),
      offsets[5 + i]
    );
  }
  return binMsg.buffer;
}

/**
 * Deserialize and return the unpacked message.
 * Default protocol
 *
 * #### Notes
 * Handles JSON blob strings and binary messages.
 */
function deserialize_default(
  data: ArrayBuffer | string
): KernelMessage.IMessage {
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
 * Default protocol
 *
 * #### Notes
 * If there is binary content, an `ArrayBuffer` is returned,
 * otherwise the message is converted to a JSON string.
 */
function serialize_default(msg: KernelMessage.IMessage): string | ArrayBuffer {
  let value: string | ArrayBuffer;
  if (msg.buffers?.length) {
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
  const data = new DataView(buf);
  // read the header: 1 + nbufs 32b integers
  const nbufs = data.getUint32(0);
  const offsets: number[] = [];
  if (nbufs < 2) {
    throw new Error('Invalid incoming Kernel Message');
  }
  for (let i = 1; i <= nbufs; i++) {
    offsets.push(data.getUint32(i * 4));
  }
  const jsonBytes = new Uint8Array(buf.slice(offsets[0], offsets[1]));
  const msg = JSON.parse(new TextDecoder('utf8').decode(jsonBytes));
  // the remaining chunks are stored as DataViews in msg.buffers
  msg.buffers = [];
  for (let i = 1; i < nbufs; i++) {
    const start = offsets[i];
    const stop = offsets[i + 1] || buf.byteLength;
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
  const offsets: number[] = [];
  const buffers: ArrayBuffer[] = [];
  const encoder = new TextEncoder();
  let origBuffers: (ArrayBuffer | ArrayBufferView)[] = [];
  if (msg.buffers !== undefined) {
    origBuffers = msg.buffers;
    delete msg['buffers'];
  }
  const jsonUtf8 = encoder.encode(JSON.stringify(msg));
  buffers.push(jsonUtf8.buffer);
  for (let i = 0; i < origBuffers.length; i++) {
    // msg.buffers elements could be either views or ArrayBuffers
    // buffers elements are ArrayBuffers
    const b: any = origBuffers[i];
    buffers.push(ArrayBuffer.isView(b) ? b.buffer : b);
  }
  const nbufs = buffers.length;
  offsets.push(4 * (nbufs + 1));
  for (let i = 0; i + 1 < buffers.length; i++) {
    offsets.push(offsets[offsets.length - 1] + buffers[i].byteLength);
  }
  const msgBuf = new Uint8Array(
    offsets[offsets.length - 1] + buffers[buffers.length - 1].byteLength
  );
  // use DataView.setUint32 for network byte-order
  const view = new DataView(msgBuf.buffer);
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
