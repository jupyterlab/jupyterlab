// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as KernelMessage from './messages';

/**
 * Deserialize and return the unpacked message.
 */
export function deserialize(binMsg: ArrayBuffer): KernelMessage.IMessage {
  let msg: KernelMessage.IMessage;
  const data = new DataView(binMsg);
  const layoutLength = data.getUint16(0, true /* littleEndian */);
  const layoutBytes = new Uint8Array(binMsg.slice(2, 2 + layoutLength));
  const decoder = new TextDecoder('utf8');
  const layout = JSON.parse(decoder.decode(layoutBytes));
  const channel = layout.channel;
  let iter = getParts(new Uint8Array(binMsg.slice(2 + layoutLength)), layout.offsets);
  const header = JSON.parse(decoder.decode(iter.next().value as Uint8Array));
  const parent_header = JSON.parse(decoder.decode(iter.next().value as Uint8Array));
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
    buffers,
  };
  return msg;
}

/**
 * Serialize a kernel message for transport.
 */
export function serialize(msg: KernelMessage.IMessage): ArrayBuffer {
  const header = JSON.stringify(msg.header);
  const parent_header = JSON.stringify(msg.parent_header);
  const metadata = JSON.stringify(msg.metadata);
  const content = JSON.stringify(msg.content);
  let offsets = [];
  let curr_sum = 0;
  for (var length of [header.length, parent_header.length, metadata.length, content.length]) {
    offsets.push(length + curr_sum);
    curr_sum += length;
  }
  let buffersLength = 0;
  const buffers: (ArrayBuffer | ArrayBufferView)[] = (msg.buffers !== undefined) ? msg.buffers : [];
  for (var buffer of buffers) {
    length = buffer.byteLength;
    offsets.push(length + curr_sum);
    curr_sum += length;
    buffersLength += length;
  }
  const layoutJson = {
    channel: msg.channel,
    offsets,
  };
  const layout = JSON.stringify(layoutJson);
  const layoutLength = new ArrayBuffer(2);
  new DataView(layoutLength).setInt16(0, layout.length, true /* littleEndian */);
  const encoder = new TextEncoder();
  const binMsgNoBuff = encoder.encode(layout + header + parent_header + metadata + content);
  const binMsg = new Uint8Array(2 + binMsgNoBuff.byteLength + buffersLength);
  binMsg.set(new Uint8Array(layoutLength), 0);
  binMsg.set(new Uint8Array(binMsgNoBuff), 2);
  let pos = 2 + binMsgNoBuff.byteLength;
  for (var buffer of buffers) {
    binMsg.set(new Uint8Array(ArrayBuffer.isView(buffer) ? buffer.buffer : buffer), pos);
    pos += buffer.byteLength;
  }
  return binMsg.buffer;
}

function* getParts(binMsg: Uint8Array, offsets: number[]) {
  let i0 = 0;
  for (var i1 of offsets) {
    yield binMsg.slice(i0, i1);
    i0 = i1;
  }
  yield binMsg.slice(i0);
}
