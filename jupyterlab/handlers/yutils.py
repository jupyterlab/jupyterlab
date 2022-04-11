from enum import IntEnum
from typing import List

import y_py as Y
from tornado.websocket import WebSocketHandler


class YMessageType(IntEnum):
    # custom messages
    RENAME_SESSION = 127

    # Y built-in messages
    SYNC = 0
    SYNC_STEP1 = 0
    SYNC_STEP2 = 1
    SYNC_UPDATE = 2


def write_var_uint(num: int) -> List[int]:
    res = []
    while num > 127:
        res += [128 | (127 & num)]
        num >>= 7
    res += [num]
    return res


def create_message(data: List[int], msg_type: int) -> bytes:
    return bytes([YMessageType.SYNC, msg_type] + write_var_uint(len(data)) + data)


def create_sync_step1_message(data: List[int]) -> bytes:
    return create_message(data, YMessageType.SYNC_STEP1)


def create_sync_step2_message(data: List[int]) -> bytes:
    return create_message(data, YMessageType.SYNC_STEP2)


def create_update_message(data: List[int]) -> bytes:
    return create_message(data, YMessageType.SYNC_UPDATE)


def get_messages(message: bytes) -> bytes:
    length = len(message)
    i0 = 0
    while True:
        msg_len = 0
        i = 0
        while True:
            byte = message[i0]
            msg_len += (byte & 127) << i
            i += 7
            i0 += 1
            length -= 1
            if byte < 128:
                break
        i1 = i0 + msg_len
        msg = message[i0:i1]
        length -= msg_len
        yield msg
        if length <= 0:
            if length < 0:
                raise RuntimeError("Y protocol error")
            break
        i0 = i1


def process_sync_message(handler: WebSocketHandler, doc: Y.YDoc, message: bytes) -> None:
    message_type = message[0]
    message = message[1:]
    if message_type == YMessageType.SYNC_STEP1:
        # received client state, reply with the missing updates
        for state in get_messages(message):
            update = Y.encode_state_as_update(doc, state)
            msg = create_sync_step2_message(update)
            handler.write_message(msg, binary=True)
    elif message_type in (YMessageType.SYNC_STEP2, YMessageType.SYNC_UPDATE):
        # received client updates, apply them
        for update in get_messages(message):
            Y.apply_update(doc, update)
    else:
        raise RuntimeError(f"Unknown Y message type: {message_type}")
