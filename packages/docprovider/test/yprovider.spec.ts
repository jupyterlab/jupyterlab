// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { PythonWebSocketServer, signalToPromise } from '@jupyterlab/testutils';

import { User } from '@jupyterlab/user';
import { SharedDoc } from '@jupyterlab/shared-models';

import { ProviderMock, WebSocketProvider } from '../src';

describe('@jupyterlab/docprovider', () => {
  describe('MockProvider', () => {
    it('should have a type', () => {
      expect(ProviderMock).not.toBeUndefined();
    });
  });

  describe('WebSocketProvider', () => {
    const server = new PythonWebSocketServer();
    let sharedDoc: SharedDoc;
    let docProvider: WebSocketProvider;

    beforeEach(async () => {
      jest.setTimeout(20000);
      await server.start('localhost', '12345');

      sharedDoc = new SharedDoc();
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
      sharedDoc.dispose();
      docProvider.destroy();
      await server.shutdown();
    });

    it('Should receive updates from another client', async () => {
      const txt = sharedDoc.createString('test');
      expect(txt.text).toBe('');

      const doc2 = new SharedDoc();
      docProvider = new WebSocketProvider({
        format: '',
        contentType: '',
        path: 'test_room',
        sharedDoc: doc2,
        url: 'ws://localhost:12345',
        user: new User()
      });
      const txt2 = doc2.createString('test');

      const changed = signalToPromise(txt.changed);
      txt2.text = 'Hi!';

      const [sender, args] = await changed;
      expect(sender).toBe(txt);
      expect(args).toEqual([{ insert: 'Hi!' }]);
      expect(txt.text).toEqual('Hi!');
    });
  });
});
