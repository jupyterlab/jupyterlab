// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// We explicitly reference the jest typings since the jest.d.ts file shipped
// with jest 26 masks the @types/jest typings

/// <reference types="jest" preserve="true"/>

import { PathExt } from '@jupyterlab/coreutils';
import { PartialJSONObject, ReadonlyJSONObject, UUID } from '@lumino/coreutils';
import { AttachedProperty } from '@lumino/properties';
import { ISignal, Signal } from '@lumino/signaling';
import { BaseManager } from './basemanager';
import { Contents, ContentsManager } from './contents';
import { Kernel, KernelMessage } from './kernel';
import { KernelSpec } from './kernelspec';
import { ServiceManager } from './manager';
import { ServerConnection } from './serverconnection';
import { Session } from './session';
import { User, UserManager } from './user';

// The default kernel name
export const DEFAULT_NAME = 'python3';

export const KERNELSPECS: { [key: string]: KernelSpec.ISpecModel } = {
  [DEFAULT_NAME]: {
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
  irkernel: {
    argv: [
      '/Users/someuser/miniconda3/envs/jupyterlab/bin/python',
      '-m',
      'ipykernel_launcher',
      '-f',
      '{connection_file}'
    ],
    display_name: 'R',
    language: 'r',
    metadata: {},
    name: 'irkernel',
    resources: {}
  }
};

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
  const model = { id: 'foo', name: DEFAULT_NAME, ...options.model };
  options = {
    clientId: UUID.uuid4(),
    username: UUID.uuid4(),
    ...options,
    model
  };
  let executionCount = 0;
  const spec = Private.kernelSpecForKernelName(model.name)!;
  const thisObject: Kernel.IKernelConnection = {
    ...jest.requireActual('@jupyterlab/services'),
    ...options,
    ...model,
    model,
    serverSettings: ServerConnection.makeSettings(
      options.serverSettings as Partial<ServerConnection.ISettings>
    ),
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
      return new MockShellFuture(reply) as Kernel.IShellFuture<
        KernelMessage.IExecuteRequestMsg,
        KernelMessage.IExecuteReplyMsg
      >;
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
  const pendingInputSignal = new Signal<Kernel.IKernelConnection, boolean>(
    thisObject
  );
  (thisObject as any).statusChanged = statusChangedSignal;
  (thisObject as any).iopubMessage = iopubMessageSignal;
  (thisObject as any).pendingInput = pendingInputSignal;
  (thisObject as any).hasPendingInput = false;
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
    id: UUID.uuid4(),
    path: 'foo',
    type: 'notebook',
    name: 'foo',
    ...options.model,
    kernel: kernel!.model
  };
  const thisObject: Session.ISessionConnection = {
    ...jest.requireActual('@jupyterlab/services'),
    ...options,
    model,
    ...model,
    kernel,
    serverSettings: ServerConnection.makeSettings(
      options.serverSettings as Partial<ServerConnection.ISettings>
    ),
    dispose: jest.fn(),
    changeKernel: jest.fn(partialModel => {
      return changeKernel(kernel!, partialModel!);
    }),
    shutdown: jest.fn(() => Promise.resolve(void 0)),
    setPath: jest.fn(path => {
      (thisObject as any).path = path;
      propertyChangedSignal.emit('path');
      return Promise.resolve();
    }),
    setName: jest.fn(name => {
      (thisObject as any).name = name;
      propertyChangedSignal.emit('name');
      return Promise.resolve();
    }),
    setType: jest.fn(type => {
      (thisObject as any).type = type;
      propertyChangedSignal.emit('type');
      return Promise.resolve();
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

  const pendingInputSignal = new Signal<Session.ISessionConnection, boolean>(
    thisObject
  );

  kernel!.iopubMessage.connect((_, args) => {
    iopubMessageSignal.emit(args);
  }, thisObject);

  kernel!.statusChanged.connect((_, args) => {
    statusChangedSignal.emit(args);
  }, thisObject);

  kernel!.pendingInput.connect((_, args) => {
    pendingInputSignal.emit(args);
  }, thisObject);

  (thisObject as any).disposed = disposedSignal;
  (thisObject as any).connectionStatusChanged = connectionStatusChangedSignal;
  (thisObject as any).propertyChanged = propertyChangedSignal;
  (thisObject as any).statusChanged = statusChangedSignal;
  (thisObject as any).kernelChanged = kernelChangedSignal;
  (thisObject as any).iopubMessage = iopubMessageSignal;
  (thisObject as any).unhandledMessage = unhandledMessageSignal;
  (thisObject as any).pendingInput = pendingInputSignal;
  return thisObject;
});

/**
 * A mock contents manager.
 */
export const ContentsManagerMock = jest.fn<Contents.IManager, []>(() => {
  const files = new Map<string, Map<string, Contents.IModel>>();
  const dummy = new ContentsManager();
  const checkpoints = new Map<string, Contents.ICheckpointModel>();
  const checkPointContent = new Map<string, string>();

  const baseModel = Private.createFile({ type: 'directory' });
  // create the default drive
  files.set(
    '',
    new Map<string, Contents.IModel>([
      ['', { ...baseModel, path: '', name: '' }]
    ])
  );

  const thisObject: Contents.IManager = {
    ...jest.requireActual('@jupyterlab/services'),
    newUntitled: jest.fn(options => {
      const driveName = dummy.driveName(options?.path || '');
      const localPath = dummy.localPath(options?.path || '');
      // create the test file without the drive name
      const createOptions = { ...options, path: localPath };
      const model = Private.createFile(createOptions || {});
      // re-add the drive name to the model
      const drivePath = driveName ? `${driveName}:${model.path}` : model.path;
      const driveModel = {
        ...model,
        path: drivePath
      };
      files.get(driveName)!.set(model.path, driveModel);
      fileChangedSignal.emit({
        type: 'new',
        oldValue: null,
        newValue: driveModel
      });
      return Promise.resolve(driveModel);
    }),
    createCheckpoint: jest.fn(path => {
      const lastModified = new Date().toISOString();
      const data = { id: UUID.uuid4(), last_modified: lastModified };
      checkpoints.set(path, data);
      const driveName = dummy.driveName(path);
      const localPath = dummy.localPath(path);
      checkPointContent.set(
        path,
        files.get(driveName)!.get(localPath)?.content
      );
      return Promise.resolve(data);
    }),
    listCheckpoints: jest.fn(path => {
      const p = checkpoints.get(path);
      if (p !== undefined) {
        return Promise.resolve([p]);
      }
      return Promise.resolve([]);
    }),
    deleteCheckpoint: jest.fn(path => {
      if (!checkpoints.has(path)) {
        return Private.makeResponseError(404);
      }
      checkpoints.delete(path);
      return Promise.resolve();
    }),
    restoreCheckpoint: jest.fn(path => {
      if (!checkpoints.has(path)) {
        return Private.makeResponseError(404);
      }
      const driveName = dummy.driveName(path);
      const localPath = dummy.localPath(path);
      (files.get(driveName)!.get(localPath) as any).content =
        checkPointContent.get(path);
      return Promise.resolve();
    }),
    getSharedModelFactory: jest.fn(() => {
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
      const driveName = dummy.driveName(path);
      const localPath = dummy.localPath(path);
      const drive = files.get(driveName)!;
      path = Private.fixSlash(localPath);
      if (!drive.has(path)) {
        return Private.makeResponseError(404);
      }
      const model = drive.get(path)!;
      const overrides: { hash?: string; last_modified?: string } = {};
      if (path == 'random-hash.txt') {
        overrides.hash = Math.random().toString();
      } else if (path == 'newer-timestamp-no-hash.txt') {
        overrides.hash = undefined;
        const tomorrow = new Date();
        tomorrow.setDate(new Date().getDate() + 1);
        overrides.last_modified = tomorrow.toISOString();
      }
      if (model.type === 'directory') {
        if (options?.content !== false) {
          const content: Contents.IModel[] = [];
          drive.forEach(fileModel => {
            const localPath = dummy.localPath(fileModel.path);
            if (
              // If file path is under this directory, add it to contents array.
              PathExt.dirname(localPath) == model.path &&
              // But the directory should exclude itself from the contents array.
              fileModel !== model
            ) {
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
      return Promise.resolve({ ...model, content: '', ...overrides });
    }),
    driveName: jest.fn(path => {
      return dummy.driveName(path);
    }),
    rename: jest.fn((oldPath, newPath) => {
      const driveName = dummy.driveName(oldPath);
      const drive = files.get(driveName)!;
      let oldLocalPath = dummy.localPath(oldPath);
      let newLocalPath = dummy.localPath(newPath);
      oldLocalPath = Private.fixSlash(oldLocalPath);
      newLocalPath = Private.fixSlash(newLocalPath);
      if (!drive.has(oldLocalPath)) {
        return Private.makeResponseError(404);
      }
      const oldValue = drive.get(oldPath)!;
      drive.delete(oldPath);
      const name = PathExt.basename(newLocalPath);
      const newValue = { ...oldValue, name, path: newLocalPath };
      drive.set(newPath, newValue);
      fileChangedSignal.emit({
        type: 'rename',
        oldValue,
        newValue
      });
      return Promise.resolve(newValue);
    }),
    delete: jest.fn(path => {
      const driveName = dummy.driveName(path);
      const localPath = dummy.localPath(path);
      const drive = files.get(driveName)!;
      path = Private.fixSlash(localPath);
      if (!drive.has(path)) {
        return Private.makeResponseError(404);
      }
      const oldValue = drive.get(path)!;
      drive.delete(path);
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
      const drive = files.get(dummy.driveName(path))!;
      if (drive.has(path)) {
        const updates =
          path == 'frozen-time-and-hash.txt'
            ? {}
            : {
                last_modified: timeStamp,
                hash: timeStamp
              };
        drive.set(path, {
          ...drive.get(path)!,
          ...options,
          ...updates
        });
      } else {
        drive.set(path, {
          path,
          name: PathExt.basename(path),
          content: '',
          writable: true,
          created: timeStamp,
          type: 'file',
          format: 'text',
          mimetype: 'plain/text',
          ...options,
          last_modified: timeStamp,
          hash: timeStamp,
          hash_algorithm: 'static'
        });
      }
      fileChangedSignal.emit({
        type: 'save',
        oldValue: null,
        newValue: drive.get(path)!
      });
      return Promise.resolve(drive.get(path)!);
    }),
    getDownloadUrl: jest.fn(path => {
      return dummy.getDownloadUrl(path);
    }),
    addDrive: jest.fn(drive => {
      dummy.addDrive(drive);
      files.set(
        drive.name,
        new Map<string, Contents.IModel>([
          ['', { ...baseModel, path: '', name: '' }]
        ])
      );
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
      return Promise.resolve(session);
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
    running: jest.fn(() => sessions[Symbol.iterator]())
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
    specs: { default: DEFAULT_NAME, kernelspecs: KERNELSPECS },
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

export function changeKernel(
  kernel: Kernel.IKernelConnection,
  partialModel: Partial<Kernel.IModel>
): Promise<Kernel.IKernelConnection> {
  if (partialModel.id) {
    const kernelIdx = KERNEL_MODELS.findIndex(model => {
      return model.id === partialModel.id;
    });
    if (kernelIdx !== -1) {
      (kernel.model as any) = Private.RUNNING_KERNELS[kernelIdx].model;
      (kernel.id as any) = partialModel.id;
      return Promise.resolve(Private.RUNNING_KERNELS[kernelIdx]);
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
      (kernel.model as any) = Private.RUNNING_KERNELS[kernelIdx].model;
      (kernel.id as any) = partialModel.id;
      return Promise.resolve(Private.RUNNING_KERNELS[kernelIdx]);
    } else {
      throw new Error(
        `Unable to change kernel to one with name: ${partialModel.name}`
      );
    }
  } else {
    throw new Error(`Unable to change kernel`);
  }
}

/**
 * A namespace for module private data.
 */
namespace Private {
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

  export function makeResponseError<T>(status: number): Promise<T> {
    const resp = new Response(void 0, { status });
    return Promise.reject(new ServerConnection.ResponseError(resp));
  }

  export function cloneKernel(
    options: RecursivePartial<Kernel.IKernelConnection.IOptions>
  ): Kernel.IKernelConnection {
    return new KernelMock({ ...options, clientId: UUID.uuid4() });
  }

  // Get the kernel spec for kernel name
  export function kernelSpecForKernelName(name: string): KernelSpec.ISpecModel {
    return KERNELSPECS[name];
  }

  // Get the kernel info for kernel name
  export function getInfo(name: string): KernelMessage.IInfoReply {
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

/**
 * The user API service manager.
 */
export class FakeUserManager extends BaseManager implements User.IManager {
  private _isReady = false;
  private _ready: Promise<void>;

  private _identity: User.IIdentity;
  private _permissions: ReadonlyJSONObject;

  private _userChanged = new Signal<this, User.IUser>(this);
  private _connectionFailure = new Signal<this, Error>(this);

  /**
   * Create a new user manager.
   */
  constructor(
    options: UserManager.IOptions = {},
    identity: User.IIdentity,
    permissions: ReadonlyJSONObject
  ) {
    super(options);

    // Initialize internal data.
    this._ready = new Promise<void>(resolve => {
      // Schedule updating the user to the next macro task queue.
      setTimeout(() => {
        this._identity = identity;
        this._permissions = permissions;

        this._userChanged.emit({
          identity: this._identity,
          permissions: this._permissions as PartialJSONObject
        });

        resolve();
      }, 0);
    })
      .then(() => {
        if (this.isDisposed) {
          return;
        }
        this._isReady = true;
      })
      .catch(_ => undefined);
  }

  /**
   * The server settings for the manager.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Test whether the manager is ready.
   */
  get isReady(): boolean {
    return this._isReady;
  }

  /**
   * A promise that fulfills when the manager is ready.
   */
  get ready(): Promise<void> {
    return this._ready;
  }

  /**
   * Get the most recently fetched identity.
   */
  get identity(): User.IIdentity | null {
    return this._identity;
  }

  /**
   * Get the most recently fetched permissions.
   */
  get permissions(): ReadonlyJSONObject | null {
    return this._permissions;
  }

  /**
   * A signal emitted when the user changes.
   */
  get userChanged(): ISignal<this, User.IUser> {
    return this._userChanged;
  }

  /**
   * A signal emitted when there is a connection failure.
   */
  get connectionFailure(): ISignal<this, Error> {
    return this._connectionFailure;
  }

  /**
   * Dispose of the resources used by the manager.
   */
  dispose(): void {
    super.dispose();
  }

  /**
   * Force a refresh of the specs from the server.
   *
   * @returns A promise that resolves when the specs are fetched.
   *
   * #### Notes
   * This is intended to be called only in response to a user action,
   * since the manager maintains its internal state.
   */
  async refreshUser(): Promise<void> {
    return Promise.resolve();
  }
}
