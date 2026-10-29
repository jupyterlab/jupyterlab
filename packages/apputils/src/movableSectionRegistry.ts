// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Signal } from '@lumino/signaling';
import type {
  IMovableSectionDestination,
  IMovableSectionRegistry,
  IMovableSectionSource
} from './tokens';

/**
 * Source and target panels register themselves here so that generic
 * section-moving commands can discover them.
 */
export class MovableSectionRegistry implements IMovableSectionRegistry {
  private readonly _sources = new Map<
    string,
    { label: string; sidebar: IMovableSectionSource }
  >();
  private readonly _targets = new Map<
    string,
    { label: string; panel: IMovableSectionDestination }
  >();
  private readonly _sourcePanelRegistered = new Signal<
    this,
    { id: string; label: string; sidebar: IMovableSectionSource }
  >(this);
  private readonly _targetPanelRegistered = new Signal<
    this,
    { id: string; label: string; panel: IMovableSectionDestination }
  >(this);

  get sourcePanelRegistered(): Signal<
    this,
    { id: string; label: string; sidebar: IMovableSectionSource }
  > {
    return this._sourcePanelRegistered;
  }

  get targetPanelRegistered(): Signal<
    this,
    { id: string; label: string; panel: IMovableSectionDestination }
  > {
    return this._targetPanelRegistered;
  }

  registerSource(
    id: string,
    label: string,
    sidebar: IMovableSectionSource
  ): void {
    this._sources.set(id, { label, sidebar });
    this._sourcePanelRegistered.emit({ id, label, sidebar });
  }

  registerTarget(
    id: string,
    label: string,
    panel: IMovableSectionDestination
  ): void {
    this._targets.set(id, { label, panel });
    this._targetPanelRegistered.emit({ id, label, panel });
  }

  getSources(): ReadonlyMap<
    string,
    { label: string; sidebar: IMovableSectionSource }
  > {
    return this._sources;
  }

  getTargets(): ReadonlyMap<
    string,
    { label: string; panel: IMovableSectionDestination }
  > {
    return this._targets;
  }
}
