// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type {
  ISectionMoverRegistry,
  ISectionPanelTarget,
  ISidebarWithSections
} from './tokens';

/**
 * Source and target panels register themselves here so that generic
 * section-moving commands can discover them.
 */
export class SectionMoverRegistry implements ISectionMoverRegistry {
  private readonly _sources = new Map<
    string,
    { label: string; sidebar: ISidebarWithSections }
  >();
  private readonly _targets = new Map<
    string,
    { label: string; panel: ISectionPanelTarget }
  >();

  registerSource(
    id: string,
    label: string,
    sidebar: ISidebarWithSections
  ): void {
    this._sources.set(id, { label, sidebar });
  }

  registerTarget(id: string, label: string, panel: ISectionPanelTarget): void {
    this._targets.set(id, { label, panel });
  }

  getSources(): ReadonlyMap<
    string,
    { label: string; sidebar: ISidebarWithSections }
  > {
    return this._sources;
  }

  getTargets(): ReadonlyMap<
    string,
    { label: string; panel: ISectionPanelTarget }
  > {
    return this._targets;
  }
}
