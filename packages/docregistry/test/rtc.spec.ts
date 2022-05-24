// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import {
  PythonClient,
  PythonWebSocketServer,
  signalToPromise
} from '@jupyterlab/testutils';

import { User } from '@jupyterlab/user';
import { SharedDoc } from '@jupyterlab/shared-models';
import { WebSocketProvider } from '@jupyterlab/docprovider';

import { DocumentModel } from '..';

describe('docregistry/rtc', () => {
  const server = new PythonWebSocketServer();
  let docProvider: WebSocketProvider;
  let document: DocumentModel;

  beforeEach(async () => {
    jest.setTimeout(20000);
    await server.start('localhost', '12345');

    const sharedDoc = new SharedDoc();
    document = new DocumentModel(undefined, sharedDoc);
    docProvider = new WebSocketProvider({
      format: '',
      contentType: '',
      path: 'test_room',
      sharedDoc,
      url: 'ws://localhost:12345',
      user: new User()
    });

    docProvider.on('status', (event: any) => {
      //console.log(event.status);
    });
  });

  afterEach(async () => {
    document.dispose();
    docProvider.destroy();
    await server.shutdown();
  });

  it('Should initialize the document from the backend', async () => {
    const changed = signalToPromise(document.value.changed);
    const nbClient = new PythonClient();
    await nbClient.run('file', 'ws://localhost:12345/::test_room');
    document.initialize();

    const [sender, args] = await changed;
    expect(sender).toBe(document.value);
    expect(args).toEqual([{ insert: "print('Hello, World!')\n" }]);
    expect(document.value.text).toBe("print('Hello, World!')\n");
  });

  it('Should receive updates from another client', async () => {
    expect(document.value.text).toBe('');

    const sharedDoc = new SharedDoc();
    docProvider = new WebSocketProvider({
      format: '',
      contentType: '',
      path: 'test_room',
      sharedDoc,
      url: 'ws://localhost:12345',
      user: new User()
    });
    const source = sharedDoc.createString('source');

    const changed = signalToPromise(document.value.changed);
    source.text = 'Hi!';
    const [sender, args] = await changed;
    expect(sender).toBe(document.value);
    expect(args).toEqual([{ insert: 'Hi!' }]);
    expect(document.value.text).toEqual('Hi!');
  });
});
