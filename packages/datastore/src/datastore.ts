import { Schema, validateSchema, Table, Datastore } from '@phosphor/datastore';
import { Message } from '@phosphor/messaging';

function isTransactionMessage(
  msg: Message
): msg is Datastore.TransactionMessage {
  return msg.type === 'datastore-transaction';
}

export function createDataStore(...schemas: Array<Schema>): Datastore {
  return Datastore.create({
    schemas: schemas,
    id: Math.random(),
    broadcastHandler: { processMessage: msg => {
        if (isTransactionMessage(msg)) {
            msg.transaction.patch
        }
    } }
  });
}
