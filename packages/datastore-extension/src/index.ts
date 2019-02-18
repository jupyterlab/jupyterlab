// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Panel, Widget } from '@phosphor/widgets';

import { Datastore, ListField } from '@phosphor/datastore';

import { Message, MessageLoop } from '@phosphor/messaging';

import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { DatastoreSession, DSModelDB } from '@jupyterlab/datastore';

const pluginId = '@jupyterlab/datastore-extension:plugin';

/**
 *
 */
async function makeTestWidget(): Promise<Widget> {
  // Set up session to server:
  const chatSession = new DatastoreSession({ key: 'chat' });
  const chatSchema = {
    id: 'chat',
    fields: {
      entries: new ListField<string>()
    }
  };
  const clearance = {
    processMessage: (msg: Message) => {
      if (msg.type === 'remote-transactions') {
        MessageLoop.sendMessage(
          ds,
          new Datastore.TransactionMessage(
            (msg as DatastoreSession.RemoteTransactionMessage).transaction
          )
        );
      } else if (msg.type === 'datastore-transaction') {
        chatSession.broadcastTransactions([
          (msg as Datastore.TransactionMessage).transaction
        ]);
      }
    }
  };
  const permissions = await chatSession.permissions;
  if (!permissions.read) {
    return;
  }
  const storeId = await chatSession.createStoreId();
  const ds = Datastore.create({
    id: storeId,
    schemas: [chatSchema],
    broadcastHandler: clearance
  });
  chatSession.handler = clearance;
  const w = new Panel();
  w.id = 'datastore-test';
  w.title.label = 'datastore';
  if (permissions.write) {
    const inputW = new Widget();
    const inputText = document.createElement('textarea');
    const submitBtn = document.createElement('button');
    submitBtn.innerText = 'Send';
    inputW.node.appendChild(inputText);
    inputW.node.appendChild(submitBtn);
    w.addWidget(inputW);
    submitBtn.onclick = ev => {
      const chatTable = ds.get(chatSchema);
      const record = chatTable.get('chat');
      const n = record ? record.entries.length : 0;
      ds.beginTransaction();
      try {
        chatTable.update({
          chat: {
            entries: {
              index: n,
              remove: 0,
              values: [inputText.value]
            }
          }
        });
        inputText.value = '';
      } finally {
        ds.endTransaction();
      }
    };
  }

  function getChatChange(
    args: Datastore.IChangedArgs
  ): ListField.Change<string> {
    return args.change['chat']
      ? (args.change['chat']['chat']['entries'] as ListField.Change<string>)
      : undefined;
  }

  ds.changed.connect((sender, args) => {
    const change = getChatChange(args);
    if (!change) {
      return;
    }
    for (let part of change) {
      for (let i = part.index + part.removed.length - 1; i >= part.index; --i) {
        w.widgets[i].parent = null;
      }
      for (let entry of part.inserted) {
        const e = new Widget();
        e.node.innerText = entry;
        w.insertWidget(part.index, e);
      }
    }
  });

  await chatSession.replayHistory();

  return w;
}

/**
 * The default document manager provider.
 */
const datastorePlugin: JupyterFrontEndPlugin<void> = {
  id: pluginId,
  requires: [],
  optional: [ILabShell],
  autoStart: true,
  activate: (app: JupyterFrontEnd, labShell: ILabShell | null) => {
    const registry = app.docRegistry;
    registry.addModelDBFactory('phosphor-datastore', {
      createNew: (path, schemas) => {
        // Set up session to server:
        const session = new DatastoreSession({ key: path });

        const datastore = Promise.resolve().then(async () => {
          const clearance = {
            processMessage: (msg: Message) => {
              if (msg.type === 'remote-transactions') {
                MessageLoop.sendMessage(
                  ds,
                  new Datastore.TransactionMessage(
                    (msg as DatastoreSession.RemoteTransactionMessage).transaction
                  )
                );
              } else if (msg.type === 'datastore-transaction') {
                session.broadcastTransactions([
                  (msg as Datastore.TransactionMessage).transaction
                ]);
              }
            }
          };
          session.handler = clearance;

          const ds = Datastore.create({
            id: await session.createStoreId(),
            schemas,
            broadcastHandler: clearance
          });
          return ds;
        });

        return new DSModelDB({ datastore, schemas });
      }
    });
    labShell.restored
      .then(() => {
        return makeTestWidget();
      })
      .then(widget => {
        labShell.add(widget, 'main');
      });
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [datastorePlugin];
export default plugins;
