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
    case '0.0.1':
      return serialize_0_0_1(msg);
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
    case '0.0.1':
      return deserialize_0_0_1(data);
    default:
      return deserialize_default(data);
  }
}

/**
 * Deserialize and return the unpacked message.
 * Protocol v0.0.1
 */
function deserialize_0_0_1(binMsg: ArrayBuffer): KernelMessage.IMessage {
  let msg: KernelMessage.IMessage;
  const data = new DataView(binMsg);
  const layoutLength = data.getUint16(0, true /* littleEndian */);
  const layoutBytes = new Uint8Array(binMsg.slice(2, 2 + layoutLength));
  const decoder = new TextDecoder('utf8');
  const layout = JSON.parse(decoder.decode(layoutBytes));
  const channel = layout.channel;
  let iter = getParts(
    new Uint8Array(binMsg.slice(2 + layoutLength)),
    layout.offsets
  );
  const header = JSON.parse(decoder.decode(iter.next().value as Uint8Array));
  const parent_header = JSON.parse(
    decoder.decode(iter.next().value as Uint8Array)
  );
  const metadata = JSON.parse(decoder.decode(iter.next().value as Uint8Array));
  const content = JSON.parse(decoder.decode(iter.next().value as Uint8Array));
  let curr = iter.next();
  let buffers = [];
  while (!curr.done) {
    buffers.push(curr.value);
    curr = iter.next();
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
 * Protocol v0.0.1
 */
function serialize_0_0_1(msg: KernelMessage.IMessage): ArrayBuffer {
  const header = JSON.stringify(msg.header);
  const parent_header = JSON.stringify(msg.parent_header);
  const metadata = JSON.stringify(msg.metadata);
  const content = JSON.stringify(msg.content);
  let offsets = [];
  let curr_sum = 0;
  for (let length of [
    header.length,
    parent_header.length,
    metadata.length,
    content.length
  ]) {
    offsets.push(length + curr_sum);
    curr_sum += length;
  }
  let buffersLength = 0;
  const buffers: (ArrayBuffer | ArrayBufferView)[] =
    msg.buffers !== undefined ? msg.buffers : [];
  for (let buffer of buffers) {
    let length = buffer.byteLength;
    offsets.push(length + curr_sum);
    curr_sum += length;
    buffersLength += length;
  }
  const layoutJson = {
    channel: msg.channel,
    offsets
  };
  const layout = JSON.stringify(layoutJson);
  const layoutLength = new ArrayBuffer(2);
  new DataView(layoutLength).setInt16(
    0,
    layout.length,
    true /* littleEndian */
  );
  const encoder = new TextEncoder();
  const binMsgNoBuff = encoder.encode(
    layout + header + parent_header + metadata + content
  );
  const binMsg = new Uint8Array(2 + binMsgNoBuff.byteLength + buffersLength);
  binMsg.set(new Uint8Array(layoutLength), 0);
  binMsg.set(new Uint8Array(binMsgNoBuff), 2);
  let pos = 2 + binMsgNoBuff.byteLength;
  for (let buffer of buffers) {
    binMsg.set(
      new Uint8Array(ArrayBuffer.isView(buffer) ? buffer.buffer : buffer),
      pos
    );
    pos += buffer.byteLength;
  }
  return binMsg.buffer;
}

function* getParts(binMsg: Uint8Array, offsets: number[]) {
  let i0 = 0;
  for (let i1 of offsets) {
    yield binMsg.slice(i0, i1);
    i0 = i1;
  }
  yield binMsg.slice(i0);
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
