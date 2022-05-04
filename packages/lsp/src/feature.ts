import { ISignal, Signal } from '@lumino/signaling';
import mergeWith from 'lodash.mergewith';

import { ClientCapabilities } from './lsp';
import { IFeature, ILSPFeatureManager } from './tokens';

export class FeatureManager implements ILSPFeatureManager {
  public readonly features: Array<IFeature> = [];
  private _featuresRegistered: Signal<ILSPFeatureManager, IFeature>;
  constructor() {
    this._featuresRegistered = new Signal(this);
  }

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

  get featuresRegistered(): ISignal<ILSPFeatureManager, IFeature> {
    return this._featuresRegistered;
  }

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
}
