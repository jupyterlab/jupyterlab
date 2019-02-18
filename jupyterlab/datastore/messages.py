
import uuid

def create_storeid_reply(parent_id, store_id):
    return dict(
        msgId=str(uuid.uuid4()),
        msgType='storeid-reply',
        parentId=parent_id,
        content=dict(
            storeId=store_id
        )
    )

def create_transactions_ack(parent_id, transactions, serials):
    return dict(
        msgId=str(uuid.uuid4()),
        msgType='transaction-ack',
        parentId=parent_id,
        content=dict(
            transactionIds=[t['id'] for t in transactions],
            serials=[serials[t['id']] for t in transactions]
        )
    )

def create_history_reply(parent_id, transactions):
    return dict(
        msgId=str(uuid.uuid4()),
        msgType='history-reply',
        parentId=parent_id,
        content=dict(
            transactions=transactions
        )
    )

def create_transaction_reply(parent_id, transactions):
    return dict(
        msgId=str(uuid.uuid4()),
        msgType='transaction-reply',
        parentId=parent_id,
        content=dict(
            transactions=transactions
        )
    )

def create_permissions_reply(parent_id, read, write):
    return dict(
        msgId=str(uuid.uuid4()),
        msgType='permissions-reply',
        parentId=parent_id,
        content=dict(
            read=read,
            write=write
        )
    )

def create_error_reply(parent_id, reason):
    return dict(
        msgId=str(uuid.uuid4()),
        msgType='error-reply',
        parentId=parent_id,
        content=dict(
            reason=reason
        )
    )
