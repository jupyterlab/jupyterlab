# JupyterLab Services

Javascript client for the Jupyter services REST APIs

[API Docs](http://jupyterlab.github.io/jupyterlab/)

[REST API Docs](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml)

Note: All functions and classes using the REST API allow a `serverSettings`
parameter to configure requests.
Requests are made using the `fetch` API, which is available in modern browsers
or via `npm install fetch` for node users. The `whatwg-fetch` npm package
can be used to polyfill browsers that do not support the `fetch` API.

## Package Install

**Prerequisites**

- [node](http://nodejs.org/)
- [python](https://www.anaconda.com/distribution/)

```bash
npm install --save @jupyterlab/services
conda install notebook  # notebook 4.3+ required
```

## Source Build

**Prerequisites**

- [git](http://git-scm.com/)
- [node 0.12+](http://nodejs.org/)
- [python](https://www.anaconda.com/distribution/)

```bash
git clone https://github.com/jupyterlab/jupyterlab.git
cd packages/services
npm install
npm run build
conda install notebook  # notebook 4.3+ required
```

**Rebuild**

```bash
npm run clean
npm run build
```

## Run Tests

Follow the source build instructions first.

```bash
npm test
```

## Build Docs

Follow the source build instructions first.

```bash
npm run docs
```

Navigate to `docs/index.html`.

## Supported Runtimes

The runtime versions which are currently _known to work_ are listed below.
Earlier versions may also work, but come with no guarantees.

- Node 0.12.7+
- IE 11+
- Firefox 32+
- Chrome 38+

Note: "requirejs" may need be included in a global context for `Comm` targets
using the a `target_module` (in the classic Notebook).
This can be as a `<script>` tag in the browser or by using the `requirejs`
package in node (`npm install requirejs` and setting
`global.requirejs = require('requirejs');`).

## Starting the Notebook Server

Follow the package install instructions first.

The library requires a running Jupyter Notebook server, launched as:

```bash
jupyter notebook
```

## Bundling for the Browser

Follow the package install instructions first.

See `examples/browser` for an example of using Webpack to bundle the library.

Note: Some browsers (such as IE11), require a polyfill for Promises.
The example demonstrates the use of the polyfill. See also notes about
the `fetch` API polyfill above.

## Usage from Node.js

Follow the package install instructions first.

See `examples/node` for an example of using an ES5 node script.

## Usage Examples

**Note:** This module is fully compatible with Node/Babel/ES6/ES5. The
examples below are written in TypeScript using ES6 syntax. Simply
omit the type declarations when using a language other than TypeScript.
A translator such as Babel can be used to convert from ES6 -> ES5.

**Kernel**

```typescript
import { KernelMessage, Kernel } from '@jupyterlab/services';

// Get a list of available kernels and connect to one.
Kernel.listRunning().then(kernelModels => {
  const kernel = Kernel.connectTo(kernelModels[0]);
  console.log(kernel.name);
});

// Get info about the available kernels and start a new one.
Kernel.getSpecs().then(kernelSpecs => {
  console.log('Default spec:', kernelSpecs.default);
  console.log('Available specs', Object.keys(kernelSpecs.kernelspecs));
  // use the default name
  let options: Kernel.IOptions = {
    name: kernelSpecs.default
  };
  Kernel.startNew(options).then(kernel => {
    // Execute and handle replies.
    let future = kernel.requestExecute({ code: 'a = 1' });
    future.done.then(() => {
      console.log('Future is fulfilled');
    });
    future.onIOPub = msg => {
      console.log(msg.content); // Print rich output data.
    };

    // Restart the kernel and then send an inspect message.
    kernel.restart().then(() => {
      let request: KernelMessage.IInspectRequest = {
        code: 'hello',
        cursor_pos: 4,
        detail_level: 0
      };
      kernel.requestInspect(request).then(reply => {
        console.log(reply.content.data);
      });
    });

    // Interrupt the kernel and then send a complete message.
    kernel.interrupt().then(() => {
      kernel.requestComplete({ code: 'impor', cursor_pos: 4 }).then(reply => {
        console.log(reply.content.matches);
      });
    });

    // Register a callback for when the kernel changes state.
    kernel.statusChanged.connect(status => {
      console.log('status', status);
    });

    // Kill the kernel.
    kernel.shutdown().then(() => {
      console.log('Kernel shut down');
    });
  });
});
```

**Session**

```typescript
import { Session } from '@jupyterlab/services';

// Get a list of available sessions and connect to one.
Session.listRunning().then(sessionModels => {
  const session = Session.connectTo(sessionModels[0]);
  console.log(session.kernel.name);
});

// Start a new session.
let options = {
  kernelName: 'python',
  path: '/tmp/foo.ipynb'
};

Session.startNew(options).then(session => {
  // Execute and handle replies on the kernel.
  let future = session.kernel.requestExecute({ code: 'a = 1' });
  future.done.then(() => {
    console.log('Future is fulfilled');
  });

  // Rename the session.
  session.setPath('/local/bar.ipynb').then(() => {
    console.log('Session renamed to', session.path);
  });

  // Register a callback for when the session dies.
  session.terminated.connect(() => {
    console.log('session died');
  });

  // Kill the session.
  session.shutdown().then(() => {
    console.log('session closed');
  });
});
```

**Comm**

```typescript
import { Kernel } from '@jupyterlab/services';

// Create a comm from the server side.
//
// Get info about the available kernels and connect to one.
Kernel.getSpecs()
  .then(kernelSpecs => {
    return Kernel.startNew({
      name: kernelSpecs.default
    });
  })
  .then(kernel => {
    let comm = kernel.createComm('test');
    comm.open('initial state');
    comm.send('test');
    comm.close('bye');
  });

// Create a comm from the client side.
Kernel.getSpecs()
  .then(kernelSpecs => {
    return Kernel.startNew({
      name: kernelSpecs.default
    });
  })
  .then(kernel => {
    kernel.registerCommTarget('test2', (comm, commMsg) => {
      if (commMsg.content.target_name !== 'test2') {
        return;
      }
      comm.onMsg = msg => {
        console.log(msg); // 'hello'
      };
      comm.onClose = msg => {
        console.log(msg); // 'bye'
      };
    });

    let code = [
      'from ipykernel.comm import Comm',
      'comm = Comm(target_name="test2")',
      'comm.send(data="hello")',
      'comm.close(data="bye")'
    ].join('\n');
    kernel.requestExecute({ code: code });
  });
```

**Contents**

```typescript
import { ContentsManager } from '@jupyterlab/services';

let contents = new ContentsManager();

// Create a new python file.
contents.newUntitled({ path: '/foo', type: 'file', ext: 'py' }).then(model => {
  console.log('new file:', model.path);
});

// Get the contents of a directory.
contents.get('/foo/bar').then(model => {
  console.log('files:', model.content);
});

// Rename a file.
contents.rename('/foo/bar.txt', '/foo/baz.txt');

// Save a file.
contents.save('/foo/test.ipynb');

// Delete a file.
contents.delete('/foo/bar.txt');

// Copy a file.
contents.copy('/foo/bar.txt', '/baz').then(model => {
  console.log('new path', model.path);
});

// Create a checkpoint.
contents.createCheckpoint('/foo/bar.ipynb').then(model => {
  let checkpoint = model;

  // Restore a checkpoint.
  contents.restoreCheckpoint('/foo/bar.ipynb', checkpoint.id);

  // Delete a checkpoint.
  contents.deleteCheckpoint('/foo/bar.ipynb', checkpoint.id);
});

// List checkpoints for a file.
contents.listCheckpoints('/foo/bar.txt').then(models => {
  console.log(models[0].id);
});
```

**Configuration**

```typescript
import { ConfigWithDefaults, ConfigSection } from '@jupyterlab/services';

// The base url of the Jupyter server.

ConfigSection.create({ name: 'notebook' }).then(section => {
  let config = new ConfigWithDefaults({
    section,
    defaults: { default_cell_type: 'code' },
    className: 'Notebook'
  });
  console.log(config.get('default_cell_type')); // 'code'
  config.set('foo', 'bar').then(data => {
    console.log(data); // "{ 'foo': 'bar' }"
  });
});
```

**Terminals**

```typescript
import { TerminalSession } from '@jupyterlab/services';

// Create a named terminal session and send some data.
TerminalSession.startNew().then(session => {
  session.send({ type: 'stdin', content: ['foo'] });
});
```

## Overview

### Clients

A _client_ is a single entity connected to a kernel. Since kernel messages
include the client id, it is easy for a client to filter kernel messages for
just messages between it and the kernel. In JupyterLab, different activities
(such as a console and a notebook) are often considered separate clients when
connected to the same kernel.

### Kernel specs

A _kernel spec_ is the data about an available kernel on the system. You can
retrieve a current list of kernel specs from the server.

### Kernels

A _kernel_ represents a running process on the server that implements the
Jupyter kernel messaging protocol.

#### Kernel model

A _kernel model_ mirrors the server kernel models, and represents a single
running kernel on the server. The kernel models can be refreshed from the
server, created, restarted, and shut down. A kernel model's lifecycle mirrors
the server kernel model's lifecycle, and it will be disposed when the server
kernel is shut down.

TODO: How do we operate on kernel models?

- Module-level functions?
- Kernel model methods?
- Kernel connection methods?
- A separate kernel manager?

#### Kernel connection

A _kernel connection_ represents a single client connecting to a kernel over a
websocket. The kernel connection owns a websocket connection (which may be
recreated if the connection is dropped), and holds a reference to the kernel
model. Typically only one kernel connection handles comms for any given kernel
model. The kernel connection is disposed when the client no longer has a need
for the connection, but disposal will not cause the kernel to shut down. If a
kernel is shut down, all existing kernel connections will be disposed.

The kernel connection has a number of signals, such as for kernel status, etc.
It also tracks the connection status as a separate thing.

### Sessions

A _session_ is a mapping on the server from an identifying string name to a
kernel. A session has a few other pieces of information to allow for easy
categorization and searching of sessions.

The primary usecase of a session is to enable persisting a connection to a
kernel. For example, a notebook viewer may start a session with session name
of the notebook's file path. When a browser is refreshed, the notebook viewer
can connect to the same kernel by asking the server for the session
corresponding with the notebook file path.

Note that for this to be really useful across kernel changes and shutdowns, we
may need to change the notebook server behavior to let sessions persist beyond
the kernel's lifetime. See https://github.com/jupyter/notebook/pull/4874 for a
way to do this.

#### Session model

A _session model_ mirrors a server session. A session owns its associated
kernel and is responsible for its life cycle. The session models can be
refreshed from the server, created, changed (including creating a new session
kernel), and shut down (which implies that the kernel will be shut down). A
session model's lifecycle mirrors the server session's lifecycle, and it will
be disposed when the server session is shut down.

TODO: How do we operate on session models?

- Module-level functions?
- session model methods?
- session connection methods?
- A separate session manager?

#### Session connection

A session connection represents a single client connected to a session's
kernel. A session's kernel connection can change and may be null to signify no
current kernel connection (this may happen between when a user stops a kernel
and starts a new kernel). A session connection owns the kernel connection,
meaning the kernel connection is created and disposed by the session
connection as needed. The session connection proxies signals from the kernel
connection for convenience (e.g., you can listen to the session's status
signal to get status changes for whatever the current kernel is, without
having to disconnect and reconnect your signal handlers every time the session
kernel changes). The session connection holds a reference to the session
model. The session connection can be disposed when the client no longer is
connected to that session's kernel, and disposal will not cause the session
model to be deleted.

### Client session connection

A _client session connection_ is an object which has the same lifecycle as the
client. The client session connection owns a session connection (which may be
null if the client is not currently associated with a session). The client
session proxies the current session connection's signals for convenience. The
client session primarily serves as a stable object for a client to keep track
of the current session connection. A client may serialize the current session
connection's name so that it can rehydrate a client session having the right
session connection.
