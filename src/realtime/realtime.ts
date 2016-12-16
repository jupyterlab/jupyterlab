// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISignal
} from '@phosphor/signaling';

import {
  Token
} from '@phosphor/application';

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  InstanceTracker
} from '../common/instancetracker';

import {
  IObservableString
} from '../common/observablestring';

import {
  IObservableUndoableVector, ISerializable
} from '../common/undoablevector';

/* tslint:disable */
/**
 * The realtime service token.
 */
export
const IRealtime = new Token<IRealtime>('jupyter.services.realtime');
/* tslint:enable */


/**
 * Interface for a Realtime service.
 */
export
interface IRealtime {

  shareDocument(model: IRealtimeModel): Promise<void>;

  openSharedDocument(model: IRealtimeModel): Promise<void>;

  ready: Promise<void>;
}

/**
 * Interface for an object which has the ability to be shared via
 * the realtime interface. These objects are required to implement
 * method `registerCollaborative( handler : IRealtimeHandler)`
 * which describes to the handler the members which are realtime-enabled.
 */
export
interface IRealtimeModel {
  /**
   * Register this object as collaborative.
   */
  registerCollaborative (handler: IRealtimeHandler): Promise<void>;
}


/**
 * Interface for an object that coordinates realtime collaboration between
 * objects. These objects are expected to subscribe to the handler using
 * IRealtimeModel.registerCollaborative( handler : IRealtimeHandller)`.
 * There should be one realtime handler per realtime model.
 */
export
interface IRealtimeHandler {
  /**
   * Include a string in the realtime model.
   */
  createString(initialValue?: string) : Promise<IObservableString>;

  /**
   * Include a string in the realtime model.
   */
  createVector<T extends ISynchronizable<T> >(factory: (value:JSONObject)=>T, initialValue?: IObservableUndoableVector<T>) : Promise<IObservableUndoableVector<T>>;
}

/**
 * Interface for an object which is both able to be serialized,
 * as well as able to signal a request for synchronization
 * through an IRealtimeHandler. This request may be every time
 * the object changes, or it may be batched in some way.
 */
export
interface ISynchronizable<T> extends ISerializable {
  readonly synchronizeRequest: ISignal<T, void>;
}
