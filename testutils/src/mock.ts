// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

import { ISessionContext, SessionContext } from '@jupyterlab/apputils';

import {
  Kernel,
  KernelMessage,
  KernelSpec,
  Session,
  ServiceManager
} from '@jupyterlab/services';

import { AttachedProperty } from '@lumino/properties';

import { UUID } from '@lumino/coreutils';

import { Signal } from '@lumino/signaling';

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
    name: 'python3',
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
    name: 'python3',
    id: UUID.uuid4()
  },
  {
    name: 'r',
    id: UUID.uuid4()
  },
  {
    name: 'python3',
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
): SessionContext {
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
    (model! as any).name = KERNEL_MODELS[0].name;
  }
  options = {
    clientId: UUID.uuid4(),
    username: UUID.uuid4(),
    ...options,
    model
  };
  let executionCount = 0;
  const spec = Private.kernelSpecForKernelName(model!.name!)!;
  const thisObject = {
    ...jest.requireActual('@jupyterlab/services'),
    ...options,
    ...model,
    status: 'idle',
    spec: () => {
      return Promise.resolve(spec);
    },
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
    info: jest.fn(Promise.resolve),
    shutdown: jest.fn(Promise.resolve),
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
    requestExecute: jest.fn(code => {
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
          code,
          execution_count: executionCount
        }
      });
      iopubMessageSignal.emit(msg);
      return new MockShellFuture();
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
  const name = kernel?.name || options.model?.name || KERNEL_MODELS[0].name;
  kernel = kernel || new KernelMock({ model: { name } });
  const model = {
    path: 'foo',
    type: 'notebook',
    name: 'foo',
    ...options.model,
    kernel: kernel!.model
  };
  const thisObject = {
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
    selectKernel: jest.fn(),
    shutdown: jest.fn(() => {
      return Promise.resolve();
    })
  };
  const statusChangedSignal = new Signal<
  Session.ISessionConnection,
  Kernel.Status
  >(thisObject);
  const kernelChangedSignal = new Signal<
  Session.ISessionConnection,
  Session.ISessionConnection.IKernelChangedArgs
  >(thisObject);
  const iopubMessageSignal = new Signal<
  Session.ISessionConnection,
  KernelMessage.IIOPubMessage
  >(thisObject);

  kernel!.iopubMessage.connect((_, args) => {
    iopubMessageSignal.emit(args);
  }, thisObject);

  kernel!.statusChanged.connect((_, args) => {
    statusChangedSignal.emit(args);
  }, thisObject);

  (thisObject as any).statusChanged = statusChangedSignal;
  (thisObject as any).kernelChanged = kernelChangedSignal;
  (thisObject as any).iopubMessage = iopubMessageSignal;
  return thisObject;
});

/**
 * A mock session context.
 *
 * @param session The session connection object to use
 */
export const SessionContextMock = jest.fn<
SessionContext,
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
  const thisObject = {
    ...jest.requireActual('@jupyterlab/apputils'),
    ...options,
    path: session.path,
    type: session.type,
    name: session.name,
    kernel: session.kernel,
    session,
    dispose: jest.fn(),
    initialize: jest.fn(() => {
      return Promise.resolve();
    }),
    ready: jest.fn(() => {
      return Promise.resolve();
    }),
    changeKernel: jest.fn(partialModel => {
      return Private.changeKernel(
        session.kernel || Private.RUNNING_KERNELS_MOCKS[0],
        partialModel!
      );
    }),
    shutdown: jest.fn(() => {
      return Promise.resolve();
    })
  };

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
  (thisObject as any).session = session;

  return thisObject;
});

/**
 * A mock service manager.
 */
export const ServiceManagerMock = jest.fn<ServiceManager, []>(() => ({
  ...jest.requireActual('@jupyterlab/services'),
  ready: jest.fn(() => {
    return Promise.resolve();
  })
}));

/**
 * A mock kernel shell future.
 */
export const MockShellFuture = jest.fn<Kernel.IShellFuture, []>(() => ({
  ...jest.requireActual('@jupyterlab/services'),
  done: jest.fn(() => {
    return Promise.resolve();
  })
}));

/**
 * A namespace for module private data.
 */
namespace Private {
  export function flattenArray<T>(arr: T[][]): T[] {
    let result: T[] = [];

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

  export function cloneKernel(
    options: RecursivePartial<Kernel.IKernelConnection.IOptions>
  ): Kernel.IKernelConnection {
    return new KernelMock(options);
  }

  // Get the kernel spec for kernel name
  export function kernelSpecForKernelName(name: string) {
    return KERNELSPECS.find(val => {
      return val.name === name;
    });
  }

  export function changeKernel(
    kernel: Kernel.IKernelConnection,
    partialModel: Partial<Kernel.IModel>
  ): Promise<Kernel.IModel> {
    if (partialModel.id) {
      let kernelIdx = KERNEL_MODELS.findIndex(model => {
        return model.id === partialModel.id;
      });
      if (kernelIdx !== -1) {
        (kernel.model as any) = RUNNING_KERNELS_MOCKS[kernelIdx].model;
        (kernel.id as any) = partialModel.id;
        return Promise.resolve(RUNNING_KERNELS_MOCKS[kernelIdx]);
      } else {
        throw new Error(
          `Unable to change kernel to one with id: ${partialModel.id}`
        );
      }
    } else if (partialModel.name) {
      let kernelIdx = KERNEL_MODELS.findIndex(model => {
        return model.name === partialModel.name;
      });
      if (kernelIdx !== -1) {
        (kernel.model as any) = RUNNING_KERNELS_MOCKS[kernelIdx].model;
        (kernel.id as any) = partialModel.id;
        return Promise.resolve(RUNNING_KERNELS_MOCKS[kernelIdx]);
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
  export const RUNNING_KERNELS_MOCKS: Kernel.IKernelConnection[] = KERNEL_MODELS.map(
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
