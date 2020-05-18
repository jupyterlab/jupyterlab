// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

import { ISessionContext, SessionContext } from '@jupyterlab/apputils';

import { Context, TextModelFactory } from '@jupyterlab/docregistry';

import {
  Kernel,
  KernelMessage,
  KernelSpec,
  Session,
  ServiceManager,
  Contents,
  ServerConnection,
  ContentsManager
} from '@jupyterlab/services';

import { ArrayIterator } from '@lumino/algorithm';

import { AttachedProperty } from '@lumino/properties';

import { UUID } from '@lumino/coreutils';

import { Signal } from '@lumino/signaling';

import { PathExt } from '@jupyterlab/coreutils';

// The default kernel name
export const DEFAULT_NAME = 'python3';

export const KERNELSPECS: KernelSpec.ISpecModel[] = [
  {
    argv: [
      '/Users/someuser/miniconda3/envs/jupyterlab/bin/python',
      '-m',
      'ipykernel_launcher',
      '-f',
      '{connection_file}'
    ],
    display_name: 'Python 3',
    language: 'python',
    metadata: {},
    name: DEFAULT_NAME,
    resources: {}
  },
  {
    argv: [
      '/Users/someuser/miniconda3/envs/jupyterlab/bin/python',
      '-m',
      'ipykernel_launcher',
      '-f',
      '{connection_file}'
    ],
    display_name: 'R',
    language: 'python',
    metadata: {},
    name: 'irkernel',
    resources: {}
  }
];

export const KERNEL_MODELS: Kernel.IModel[] = [
  {
    name: DEFAULT_NAME,
    id: UUID.uuid4()
  },
  {
    name: 'r',
    id: UUID.uuid4()
  },
  {
    name: DEFAULT_NAME,
    id: UUID.uuid4()
  }
];

// Notebook Paths for certain kernel name
export const NOTEBOOK_PATHS: { [kernelName: string]: string[] } = {
  python3: ['Untitled.ipynb', 'Untitled1.ipynb', 'Untitled2.ipynb'],
  r: ['Visualization.ipynb', 'Analysis.ipynb', 'Conclusion.ipynb']
};

/**
 * Forceably change the status of a session context.
 * An iopub message is emitted for the change.
 *
 * @param sessionContext The session context of interest.
 * @param newStatus The new kernel status.
 */
export function updateKernelStatus(
  sessionContext: ISessionContext,
  newStatus: KernelMessage.Status
) {
  const kernel = sessionContext.session!.kernel!;
  (kernel as any).status = newStatus;
  (sessionContext.statusChanged as any).emit(newStatus);
  const msg = KernelMessage.createMessage({
    session: kernel.clientId,
    channel: 'iopub',
    msgType: 'status',
    content: { execution_state: newStatus }
  });
  emitIopubMessage(sessionContext, msg);
}

/**
 * Emit an iopub message on a session context.
 *
 * @param sessionContext The session context
 * @param msg Message created with `KernelMessage.createMessage`
 */
export function emitIopubMessage(
  context: ISessionContext,
  msg: KernelMessage.IIOPubMessage
): void {
  const kernel = context!.session!.kernel!;
  const msgId = Private.lastMessageProperty.get(kernel);
  (msg.parent_header as any).session = kernel.clientId;
  (msg.parent_header as any).msg_id = msgId;
  (kernel.iopubMessage as any).emit(msg);
}

/**
 * Create a session context given a partial session model.
 *
 * @param model The session model to use.
 */
export function createSimpleSessionContext(
  model: Private.RecursivePartial<Session.IModel> = {}
): ISessionContext {
  const kernel = new KernelMock({ model: model?.kernel || {} });
  const session = new SessionConnectionMock({ model }, kernel);
  return new SessionContextMock({}, session);
}

/**
 * Clone a kernel connection.
 */
export function cloneKernel(
  kernel: Kernel.IKernelConnection
): Kernel.IKernelConnection {
  return (kernel as any).clone();
}

/**
 * A mock kernel object.
 *
 * @param model The model of the kernel
 */
export const KernelMock = jest.fn<
  Kernel.IKernelConnection,
  [Private.RecursivePartial<Kernel.IKernelConnection.IOptions>]
>(options => {
  const model = options.model || {};
  if (!model.id) {
    (model! as any).id = 'foo';
  }
  if (!model.name) {
    (model! as any).name = DEFAULT_NAME;
  }
  options = {
    clientId: UUID.uuid4(),
    username: UUID.uuid4(),
    ...options,
    model
  };
  let executionCount = 0;
  const spec = Private.kernelSpecForKernelName(model!.name!)!;
  const thisObject: Kernel.IKernelConnection = {
    ...jest.requireActual('@jupyterlab/services'),
    ...options,
    ...model,
    status: 'idle',
    spec: Promise.resolve(spec),
    dispose: jest.fn(),
    clone: jest.fn(() => {
      const newKernel = Private.cloneKernel(options);
      newKernel.iopubMessage.connect((_, args) => {
        iopubMessageSignal.emit(args);
      });
      newKernel.statusChanged.connect((_, args) => {
        (thisObject as any).status = args;
        statusChangedSignal.emit(args);
      });
      return newKernel;
    }),
    info: Promise.resolve(Private.getInfo(model!.name!)),
    shutdown: jest.fn(() => Promise.resolve(void 0)),
    requestHistory: jest.fn(() => {
      const historyReply = KernelMessage.createMessage({
        channel: 'shell',
        msgType: 'history_reply',
        session: options.clientId!,
        username: options.username!,
        content: {
          history: [],
          status: 'ok'
        }
      });
      return Promise.resolve(historyReply);
    }),
    restart: jest.fn(() => Promise.resolve(void 0)),
    requestExecute: jest.fn(options => {
      const msgId = UUID.uuid4();
      executionCount++;
      Private.lastMessageProperty.set(thisObject, msgId);
      const msg = KernelMessage.createMessage({
        channel: 'iopub',
        msgType: 'execute_input',
        session: thisObject.clientId,
        username: thisObject.username,
        msgId,
        content: {
          code: options.code,
          execution_count: executionCount
        }
      });
      iopubMessageSignal.emit(msg);
      const reply = KernelMessage.createMessage<KernelMessage.IExecuteReplyMsg>(
        {
          channel: 'shell',
          msgType: 'execute_reply',
          session: thisObject.clientId,
          username: thisObject.username,
          msgId,
          content: {
            user_expressions: {},
            execution_count: executionCount,
            status: 'ok'
          }
        }
      );
      return new MockShellFuture(reply);
    })
  };
  // Add signals.
  const iopubMessageSignal = new Signal<
    Kernel.IKernelConnection,
    KernelMessage.IIOPubMessage
  >(thisObject);
  const statusChangedSignal = new Signal<
    Kernel.IKernelConnection,
    Kernel.Status
  >(thisObject);
  (thisObject as any).statusChanged = statusChangedSignal;
  (thisObject as any).iopubMessage = iopubMessageSignal;
  return thisObject;
});

/**
 * A mock session connection.
 *
 * @param options Addition session options to use
 * @param model A session model to use
 */
export const SessionConnectionMock = jest.fn<
  Session.ISessionConnection,
  [
    Private.RecursivePartial<Session.ISessionConnection.IOptions>,
    Kernel.IKernelConnection | null
  ]
>((options, kernel) => {
  const name = kernel?.name || options.model?.kernel?.name || DEFAULT_NAME;
  kernel = kernel || new KernelMock({ model: { name } });
  const model = {
    path: 'foo',
    type: 'notebook',
    name: 'foo',
    ...options.model,
    kernel: kernel!.model
  };
  const thisObject: Session.ISessionConnection = {
    ...jest.requireActual('@jupyterlab/services'),
    id: UUID.uuid4(),
    ...options,
    model,
    ...model,
    kernel,
    dispose: jest.fn(),
    changeKernel: jest.fn(partialModel => {
      return Private.changeKernel(kernel!, partialModel!);
    }),
    shutdown: jest.fn(() => Promise.resolve(void 0)),
    setPath: jest.fn(path => {
      (thisObject as any).path = path;
      propertyChangedSignal.emit('path');
    }),
    setName: jest.fn(name => {
      (thisObject as any).name = name;
      propertyChangedSignal.emit('name');
    }),
    setType: jest.fn(type => {
      (thisObject as any).type = type;
      propertyChangedSignal.emit('type');
    })
  };
  const disposedSignal = new Signal<Session.ISessionConnection, undefined>(
    thisObject
  );
  const propertyChangedSignal = new Signal<
    Session.ISessionConnection,
    'path' | 'name' | 'type'
  >(thisObject);
  const statusChangedSignal = new Signal<
    Session.ISessionConnection,
    Kernel.Status
  >(thisObject);
  const connectionStatusChangedSignal = new Signal<
    Session.ISessionConnection,
    Kernel.ConnectionStatus
  >(thisObject);
  const kernelChangedSignal = new Signal<
    Session.ISessionConnection,
    Session.ISessionConnection.IKernelChangedArgs
  >(thisObject);
  const iopubMessageSignal = new Signal<
    Session.ISessionConnection,
    KernelMessage.IIOPubMessage
  >(thisObject);

  const unhandledMessageSignal = new Signal<
    Session.ISessionConnection,
    KernelMessage.IMessage
  >(thisObject);

  kernel!.iopubMessage.connect((_, args) => {
    iopubMessageSignal.emit(args);
  }, thisObject);

  kernel!.statusChanged.connect((_, args) => {
    statusChangedSignal.emit(args);
  }, thisObject);

  (thisObject as any).disposed = disposedSignal;
  (thisObject as any).connectionStatusChanged = connectionStatusChangedSignal;
  (thisObject as any).propertyChanged = propertyChangedSignal;
  (thisObject as any).statusChanged = statusChangedSignal;
  (thisObject as any).kernelChanged = kernelChangedSignal;
  (thisObject as any).iopubMessage = iopubMessageSignal;
  (thisObject as any).unhandledMessage = unhandledMessageSignal;
  return thisObject;
});

/**
 * A mock session context.
 *
 * @param session The session connection object to use
 */
export const SessionContextMock = jest.fn<
  ISessionContext,
  [Partial<SessionContext.IOptions>, Session.ISessionConnection | null]
>((options, connection) => {
  const session =
    connection ||
    new SessionConnectionMock(
      {
        model: {
          path: options.path || '',
          type: options.type || '',
          name: options.name || ''
        }
      },
      null
    );
  const thisObject: ISessionContext = {
    ...jest.requireActual('@jupyterlab/apputils'),
    ...options,
    path: session.path,
    type: session.type,
    name: session.name,
    kernel: session.kernel,
    session,
    dispose: jest.fn(),
    initialize: jest.fn(() => Promise.resolve(void 0)),
    ready: Promise.resolve(void 0),
    changeKernel: jest.fn(partialModel => {
      return Private.changeKernel(
        session.kernel || Private.RUNNING_KERNELS[0],
        partialModel!
      );
    }),
    shutdown: jest.fn(() => Promise.resolve(void 0))
  };

  const disposedSignal = new Signal<ISessionContext, undefined>(thisObject);

  const propertyChangedSignal = new Signal<
    ISessionContext,
    'path' | 'name' | 'type'
  >(thisObject);

  const statusChangedSignal = new Signal<ISessionContext, Kernel.Status>(
    thisObject
  );
  const kernelChangedSignal = new Signal<
    ISessionContext,
    Session.ISessionConnection.IKernelChangedArgs
  >(thisObject);

  const iopubMessageSignal = new Signal<
    ISessionContext,
    KernelMessage.IIOPubMessage
  >(thisObject);

  session!.statusChanged.connect((_, args) => {
    statusChangedSignal.emit(args);
  }, thisObject);

  session!.iopubMessage.connect((_, args) => {
    iopubMessageSignal.emit(args);
  });

  session!.kernelChanged.connect((_, args) => {
    kernelChangedSignal.emit(args);
  });

  (thisObject as any).statusChanged = statusChangedSignal;
  (thisObject as any).kernelChanged = kernelChangedSignal;
  (thisObject as any).iopubMessage = iopubMessageSignal;
  (thisObject as any).propertyChanged = propertyChangedSignal;
  (thisObject as any).disposed = disposedSignal;
  (thisObject as any).session = session;

  return thisObject;
});

/**
 * A mock contents manager.
 */
export const ContentsManagerMock = jest.fn<Contents.IManager, []>(() => {
  const files = new Map<string, Contents.IModel>();
  const dummy = new ContentsManager();
  const checkpoints = new Map<string, Contents.ICheckpointModel>();
  const checkPointContent = new Map<string, string>();

  const baseModel = Private.createFile({ type: 'directory' });
  files.set('', { ...baseModel, path: '', name: '' });

  const thisObject: Contents.IManager = {
    ...jest.requireActual('@jupyterlab/services'),
    newUntitled: jest.fn(options => {
      const model = Private.createFile(options || {});
      files.set(model.path, model);
      fileChangedSignal.emit({
        type: 'new',
        oldValue: null,
        newValue: model
      });
      return Promise.resolve(model);
    }),
    createCheckpoint: jest.fn(path => {
      const lastModified = new Date().toISOString();
      checkpoints.set(path, { id: UUID.uuid4(), last_modified: lastModified });
      checkPointContent.set(path, files.get(path)?.content);
      return Promise.resolve(checkpoints.get(path));
    }),
    listCheckpoints: jest.fn(path => {
      if (checkpoints.get(path)) {
        return Promise.resolve([checkpoints.get(path)]);
      }
      return Promise.resolve([]);
    }),
    deleteCheckpoint: jest.fn(path => {
      if (!checkpoints.has(path)) {
        return Private.makeResponseError(404);
      }
      checkpoints.delete(path);
      return Promise.resolve(void 0);
    }),
    restoreCheckpoint: jest.fn(path => {
      if (!checkpoints.has(path)) {
        return Private.makeResponseError(404);
      }
      (files.get(path) as any).content = checkPointContent.get(path);
      return Promise.resolve(void 0);
    }),
    getModelDBFactory: jest.fn(() => {
      return null;
    }),
    normalize: jest.fn(path => {
      return dummy.normalize(path);
    }),
    localPath: jest.fn(path => {
      return dummy.localPath(path);
    }),
    resolvePath: jest.fn((root, path) => {
      return dummy.resolvePath(root, path);
    }),
    get: jest.fn((path, options) => {
      path = Private.fixSlash(path);
      if (!files.has(path)) {
        return Private.makeResponseError(404);
      }
      const model = files.get(path)!;
      if (model.type === 'directory') {
        if (options?.content !== false) {
          const content: Contents.IModel[] = [];
          files.forEach(fileModel => {
            if (PathExt.dirname(fileModel.path) == model.path) {
              content.push(fileModel);
            }
          });
          return Promise.resolve({ ...model, content });
        }
        return Promise.resolve(model);
      }
      if (options?.content != false) {
        return Promise.resolve(model);
      }
      return Promise.resolve({ ...model, content: '' });
    }),
    driveName: jest.fn(path => {
      return dummy.driveName(path);
    }),
    rename: jest.fn((oldPath, newPath) => {
      oldPath = Private.fixSlash(oldPath);
      newPath = Private.fixSlash(newPath);
      if (!files.has(oldPath)) {
        return Private.makeResponseError(404);
      }
      const oldValue = files.get(oldPath)!;
      files.delete(oldPath);
      const name = PathExt.basename(newPath);
      const newValue = { ...oldValue, name, path: newPath };
      files.set(newPath, newValue);
      fileChangedSignal.emit({
        type: 'rename',
        oldValue,
        newValue
      });
      return Promise.resolve(newValue);
    }),
    delete: jest.fn(path => {
      path = Private.fixSlash(path);
      if (!files.has(path)) {
        return Private.makeResponseError(404);
      }
      const oldValue = files.get(path)!;
      files.delete(path);
      fileChangedSignal.emit({
        type: 'delete',
        oldValue,
        newValue: null
      });
      return Promise.resolve(void 0);
    }),
    save: jest.fn((path, options) => {
      if (path == 'readonly.txt') {
        return Private.makeResponseError(403);
      }
      path = Private.fixSlash(path);
      const timeStamp = new Date().toISOString();
      if (files.has(path)) {
        files.set(path, {
          ...files.get(path)!,
          ...options,
          last_modified: timeStamp
        });
      } else {
        files.set(path, {
          path,
          name: PathExt.basename(path),
          content: '',
          writable: true,
          created: timeStamp,
          type: 'file',
          format: 'text',
          mimetype: 'plain/text',
          ...options,
          last_modified: timeStamp
        });
      }
      fileChangedSignal.emit({
        type: 'save',
        oldValue: null,
        newValue: files.get(path)!
      });
      return Promise.resolve(files.get(path)!);
    }),
    getDownloadUrl: jest.fn(path => {
      return dummy.getDownloadUrl(path);
    }),
    addDrive: jest.fn(drive => {
      dummy.addDrive(drive);
    }),
    dispose: jest.fn()
  };

  const fileChangedSignal = new Signal<
    Contents.IManager,
    Contents.IChangedArgs
  >(thisObject);
  (thisObject as any).fileChanged = fileChangedSignal;
  return thisObject;
});

/**
 * A mock sessions manager.
 */
export const SessionManagerMock = jest.fn<Session.IManager, []>(() => {
  let sessions: Session.IModel[] = [];
  const thisObject: Session.IManager = {
    ...jest.requireActual('@jupyterlab/services'),
    ready: Promise.resolve(void 0),
    isReady: true,
    startNew: jest.fn(options => {
      const session = new SessionConnectionMock({ model: options }, null);
      sessions.push(session.model);
      runningChangedSignal.emit(sessions);
      return session;
    }),
    connectTo: jest.fn(options => {
      return new SessionConnectionMock(options, null);
    }),
    stopIfNeeded: jest.fn(path => {
      const length = sessions.length;
      sessions = sessions.filter(model => model.path !== path);
      if (sessions.length !== length) {
        runningChangedSignal.emit(sessions);
      }
      return Promise.resolve(void 0);
    }),
    refreshRunning: jest.fn(() => Promise.resolve(void 0)),
    running: jest.fn(() => new ArrayIterator(sessions))
  };

  const runningChangedSignal = new Signal<Session.IManager, Session.IModel[]>(
    thisObject
  );
  (thisObject as any).runningChanged = runningChangedSignal;
  return thisObject;
});

/**
 * A mock kernel specs manager
 */
export const KernelSpecManagerMock = jest.fn<KernelSpec.IManager, []>(() => {
  const thisObject: KernelSpec.IManager = {
    ...jest.requireActual('@jupyterlab/services'),
    specs: { default: KERNELSPECS[0].name, kernelspecs: KERNELSPECS },
    isReady: true,
    ready: Promise.resolve(void 0),
    refreshSpecs: jest.fn(() => Promise.resolve(void 0))
  };
  return thisObject;
});

/**
 * A mock service manager.
 */
export const ServiceManagerMock = jest.fn<ServiceManager.IManager, []>(() => {
  const thisObject: ServiceManager.IManager = {
    ...jest.requireActual('@jupyterlab/services'),
    ready: Promise.resolve(void 0),
    isReady: true,
    contents: new ContentsManagerMock(),
    sessions: new SessionManagerMock(),
    kernelspecs: new KernelSpecManagerMock(),
    dispose: jest.fn()
  };
  return thisObject;
});

/**
 * A mock kernel shell future.
 */
export const MockShellFuture = jest.fn<
  Kernel.IShellFuture,
  [KernelMessage.IShellMessage]
>((result: KernelMessage.IShellMessage) => {
  const thisObject: Kernel.IShellFuture = {
    ...jest.requireActual('@jupyterlab/services'),
    dispose: jest.fn(),
    done: Promise.resolve(result)
  };
  return thisObject;
});

/**
 * Create a context for a file.
 */
export async function createFileContext(
  startKernel = false,
  manager?: ServiceManager.IManager
): Promise<Context> {
  const path = UUID.uuid4() + '.txt';
  manager = manager || new ServiceManagerMock();
  const factory = new TextModelFactory();

  const context = new Context({
    manager: manager || new ServiceManagerMock(),
    factory,
    path,
    kernelPreference: {
      shouldStart: startKernel,
      canStart: startKernel,
      autoStartDefault: startKernel
    }
  });
  await context.initialize(true);
  await context.sessionContext.initialize();
  return context;
}

/**
 * A namespace for module private data.
 */
namespace Private {
  export function flattenArray<T>(arr: T[][]): T[] {
    const result: T[] = [];

    arr.forEach(innerArr => {
      innerArr.forEach(elem => {
        result.push(elem);
      });
    });

    return result;
  }

  export type RecursivePartial<T> = {
    [P in keyof T]?: RecursivePartial<T[P]>;
  };

  export function createFile(
    options?: Contents.ICreateOptions
  ): Contents.IModel {
    options = options || {};
    let name = UUID.uuid4();
    switch (options.type) {
      case 'directory':
        name = `Untitled Folder_${name}`;
        break;
      case 'notebook':
        name = `Untitled_${name}.ipynb`;
        break;
      default:
        name = `untitled_${name}${options.ext || '.txt'}`;
    }

    const path = PathExt.join(options.path || '', name);
    let content = '';
    if (options.type === 'notebook') {
      content = JSON.stringify({});
    }
    const timeStamp = new Date().toISOString();
    return {
      path,
      content,
      name,
      last_modified: timeStamp,
      writable: true,
      created: timeStamp,
      type: options.type || 'file',
      format: 'text',
      mimetype: 'plain/text'
    };
  }

  export function fixSlash(path: string): string {
    if (path.endsWith('/')) {
      path = path.slice(0, path.length - 1);
    }
    return path;
  }

  export function makeResponseError(
    status: number
  ): Promise<ServerConnection.ResponseError> {
    const resp = new Response(void 0, { status });
    return Promise.reject(new ServerConnection.ResponseError(resp));
  }

  export function cloneKernel(
    options: RecursivePartial<Kernel.IKernelConnection.IOptions>
  ): Kernel.IKernelConnection {
    return new KernelMock({ ...options, clientId: UUID.uuid4() });
  }

  // Get the kernel spec for kernel name
  export function kernelSpecForKernelName(name: string) {
    return KERNELSPECS.find(val => {
      return val.name === name;
    });
  }

  // Get the kernel info for kernel name
  export function getInfo(
    name: string
  ): KernelMessage.IInfoReplyMsg['content'] {
    return {
      protocol_version: '1',
      implementation: 'foo',
      implementation_version: '1',
      language_info: {
        version: '1',
        name
      },
      banner: 'hello, world!',
      help_links: [],
      status: 'ok'
    };
  }

  export function changeKernel(
    kernel: Kernel.IKernelConnection,
    partialModel: Partial<Kernel.IModel>
  ): Promise<Kernel.IModel> {
    if (partialModel.id) {
      const kernelIdx = KERNEL_MODELS.findIndex(model => {
        return model.id === partialModel.id;
      });
      if (kernelIdx !== -1) {
        (kernel.model as any) = RUNNING_KERNELS[kernelIdx].model;
        (kernel.id as any) = partialModel.id;
        return Promise.resolve(RUNNING_KERNELS[kernelIdx]);
      } else {
        throw new Error(
          `Unable to change kernel to one with id: ${partialModel.id}`
        );
      }
    } else if (partialModel.name) {
      const kernelIdx = KERNEL_MODELS.findIndex(model => {
        return model.name === partialModel.name;
      });
      if (kernelIdx !== -1) {
        (kernel.model as any) = RUNNING_KERNELS[kernelIdx].model;
        (kernel.id as any) = partialModel.id;
        return Promise.resolve(RUNNING_KERNELS[kernelIdx]);
      } else {
        throw new Error(
          `Unable to change kernel to one with name: ${partialModel.name}`
        );
      }
    } else {
      throw new Error(`Unable to change kernel`);
    }
  }

  // This list of running kernels simply mirrors the KERNEL_MODELS and KERNELSPECS lists
  export const RUNNING_KERNELS: Kernel.IKernelConnection[] = KERNEL_MODELS.map(
    (model, _) => {
      return new KernelMock({ model });
    }
  );

  export const lastMessageProperty = new AttachedProperty<
    Kernel.IKernelConnection,
    string
  >({
    name: 'lastMessageId',
    create: () => ''
  });
}
