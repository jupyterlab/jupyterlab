// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import {
  PythonClient,
  PythonWebSocketServer,
  signalToPromise
} from '@jupyterlab/testutils';

import { User } from '@jupyterlab/user';
import { WebSocketProvider } from '@jupyterlab/docprovider';

import { NotebookModel } from '..';
import { SharedDoc } from '@jupyterlab/shared-models';
import { JSONValue } from '@lumino/coreutils';

describe('notebook/rtc', () => {
  const server = new PythonWebSocketServer();
  let docProvider: WebSocketProvider;
  let notebook: NotebookModel;

  beforeEach(async () => {
    jest.setTimeout(20000);
    await server.start('localhost', '12345');

    const sharedDoc = new SharedDoc();
    notebook = new NotebookModel({ sharedDoc });
    docProvider = new WebSocketProvider({
      format: '',
      contentType: '',
      path: 'test_room',
      sharedDoc,
      url: 'ws://localhost:12345',
      user: new User()
    });

    docProvider.on('status', (event: any) => {
      //console.log(event.status)
    });
  });

  afterEach(async () => {
    notebook.dispose();
    docProvider.destroy();
    await server.shutdown();
  });

  it('Should initialize the notebook from the backend', async () => {
    const nbClient = new PythonClient();
    await nbClient.run('nb', 'ws://localhost:12345/::test_room');
    notebook.initialize();
    expect(notebook.cells.length).toBe(1);
    expect(notebook.cells.get(0).value.text).toEqual("print('Hello, World!')");
  });

  it('Should receive updates from another client', async () => {
    await docProvider.ready;
    notebook.initialize();
    const sharedDoc = new SharedDoc();
    docProvider = new WebSocketProvider({
      format: '',
      contentType: '',
      path: 'test_room',
      sharedDoc,
      url: 'ws://localhost:12345',
      user: new User()
    });
    const metadata = sharedDoc.createMap<JSONValue>('metadata');
    const changed = signalToPromise(notebook.metadata.changed);
    metadata.set('test', 1);
    const [sender, args] = await changed;
    expect(sender).toBe(notebook.metadata);
    expect(args[0]).toEqual({
      key: 'test',
      type: 'add',
      oldValue: undefined,
      newValue: 1
    });
    expect(notebook.metadata.get('test')).toBe(1);
  });
});
