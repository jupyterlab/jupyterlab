// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// We explicitly reference the jest typings since the jest.d.ts file shipped
// with jest 26 masks the @types/jest typings

/// <reference types="jest" preserve="true"/>

import { ISessionContext, SessionContext } from '@jupyterlab/apputils';
import {
  Kernel,
  KernelMessage,
  ServiceManager,
  Session
} from '@jupyterlab/services';
import {
  changeKernel,
  KERNEL_MODELS,
  KernelMock,
  ServiceManagerMock,
  SessionConnectionMock
} from '@jupyterlab/services/lib/testutils';
import { UUID } from '@lumino/coreutils';
import { AttachedProperty } from '@lumino/properties';
import { ISignal, Signal } from '@lumino/signaling';
import { Context } from './context';
import { TextModelFactory } from './default';
import { DocumentRegistry, IDocumentWidget } from './registry';

/**
 * Create a context for a file.
 */
export function createFileContext(
  path: string = UUID.uuid4() + '.txt',
  manager: ServiceManager.IManager = Private.getManager()
): Context<DocumentRegistry.IModel> {
  const factory = Private.textFactory;
  return new Context({ manager, factory, path });
}

export async function createFileContextWithKernel(
  path: string = UUID.uuid4() + '.txt',
  manager: ServiceManager.IManager = Private.getManager()
): Promise<Context> {
  const factory = Private.textFactory;
  const specsManager = manager.kernelspecs;
  await specsManager.ready;

  return new Context({
    manager,
    factory,
    path,
    kernelPreference: {
      shouldStart: true,
      canStart: true,
      name: specsManager.specs?.default
    }
  });
}

export async function createFileContextWithMockedServices(
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
 * Create a session and return a session connection.
 */
export async function createSession(
  options: Session.ISessionOptions
): Promise<Session.ISessionConnection> {
  const manager = Private.getManager().sessions;
  await manager.ready;
  return manager.startNew(options);
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
 * Forcibly change the status of a session context.
 * An iopub message is emitted for the change.
 *
 * @param sessionContext The session context of interest.
 * @param newStatus The new kernel status.
 */
export function updateKernelStatus(
  sessionContext: ISessionContext,
  newStatus: KernelMessage.Status
): void {
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
    session,
    dispose: jest.fn(),
    initialize: jest.fn(() => Promise.resolve(false)),
    ready: Promise.resolve(),
    changeKernel: jest.fn(partialModel => {
      return changeKernel(
        session.kernel || Private.RUNNING_KERNELS[0],
        partialModel!
      );
    }),
    shutdown: jest.fn(() => Promise.resolve())
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

  session!.pendingInput.connect((_, args) => {
    (thisObject as any).pendingInput = args;
  });

  (thisObject as any).statusChanged = statusChangedSignal;
  (thisObject as any).kernelChanged = kernelChangedSignal;
  (thisObject as any).iopubMessage = iopubMessageSignal;
  (thisObject as any).propertyChanged = propertyChangedSignal;
  (thisObject as any).disposed = disposedSignal;
  (thisObject as any).session = session;
  (thisObject as any).pendingInput = false;

  return thisObject;
});

/**
 * A namespace for module private data.
 */
namespace Private {
  export type RecursivePartial<T> = {
    [P in keyof T]?: RecursivePartial<T[P]>;
  };

  let manager: ServiceManager;

  export const textFactory = new TextModelFactory();

  /**
   * Get or create the service manager singleton.
   */
  export function getManager(): ServiceManager {
    if (!manager) {
      manager = new ServiceManager({ standby: 'never' });
    }
    return manager;
  }

  export const lastMessageProperty = new AttachedProperty<
    Kernel.IKernelConnection,
    string
  >({
    name: 'lastMessageId',
    create: () => ''
  });

  // This list of running kernels simply mirrors the KERNEL_MODELS and KERNELSPECS lists
  export const RUNNING_KERNELS: Kernel.IKernelConnection[] = KERNEL_MODELS.map(
    (model, _) => {
      return new KernelMock({ model });
    }
  );
}

/**
 * A mock document widget opener.
 */
export class DocumentWidgetOpenerMock {
  get opened(): ISignal<DocumentWidgetOpenerMock, IDocumentWidget> {
    return this._opened;
  }

  open(widget: IDocumentWidget): void {
    // no-op, just emit the signal
    this._opened.emit(widget);
  }

  private _opened = new Signal<this, IDocumentWidget>(this);
}
