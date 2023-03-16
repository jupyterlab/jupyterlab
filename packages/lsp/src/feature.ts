// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISignal, Signal } from '@lumino/signaling';
import mergeWith from 'lodash.mergewith';

import { ClientCapabilities } from './lsp';
import { IFeature, ILSPFeatureManager } from './tokens';

/**
 * Class to manager the registered features of the language servers.
 */
export class FeatureManager implements ILSPFeatureManager {
  constructor() {
    this._featuresRegistered = new Signal(this);
  }
  /**
   * List of registered features
   */
  readonly features: Array<IFeature> = [];

  /**
   * Signal emitted when a new feature is registered.
   */
  get featuresRegistered(): ISignal<ILSPFeatureManager, IFeature> {
    return this._featuresRegistered;
  }

  /**
   * Register a new feature, skip if it is already registered.
   */
  register(feature: IFeature): void {
    if (this.features.some(ft => ft.id === feature.id)) {
      console.warn(
        `Feature with id ${feature.id} is already registered, skipping.`
      );
    } else {
      this.features.push(feature);
      this._featuresRegistered.emit(feature);
    }
  }

  /**
   * Get the capabilities of all clients.
   */
  clientCapabilities(): ClientCapabilities {
    let capabilities: ClientCapabilities = {};
    for (const feature of this.features) {
      if (!feature.capabilities) {
        continue;
      }
      capabilities = mergeWith(capabilities, feature.capabilities);
    }
    return capabilities;
  }

  private _featuresRegistered: Signal<ILSPFeatureManager, IFeature>;
}
