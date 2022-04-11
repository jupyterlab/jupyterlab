import y_py as Y

message_yjs_sync_step1 = 0
message_yjs_sync_step2 = 1
message_yjs_update = 2


def write_var_uint(num):
    res = []
    while num > 127:
        res += [128 | (127 & num)]
        num >>= 7
    res += [num]
    return res


def read_sync_step1(handler, doc, encoded_state_vector):
    message = Y.encode_state_as_update(doc, encoded_state_vector)
    message = bytes([0, message_yjs_sync_step2] + write_var_uint(len(message)) + message)
    handler.write_message(message, binary=True)


def read_sync_step2(doc, update):
    try:
        Y.apply_update(doc, update)
    except Exception:
        raise RuntimeError("Caught error while handling a Y update")


def read_sync_message(handler, doc, message):
    message_type = message[0]
    message = message[1:]
    if message_type == message_yjs_sync_step1:
        for msg in get_message(message):
            read_sync_step1(handler, doc, msg)
    elif message_type == message_yjs_sync_step2:
        for msg in get_message(message):
            read_sync_step2(doc, msg)
    elif message_type == message_yjs_update:
        for msg in get_message(message):
            read_sync_step2(doc, msg)
    else:
        raise RuntimeError("Unknown message type")


def get_message(message):
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
