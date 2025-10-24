/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 *
 * Vendored from https://github.com/yjs/y-codemirror.next
 * licensed under MIT License by Kevin Jahns.
 *
 * Ideally we would depend on the y-codemirror.next, but it is impractical
 * until https://github.com/yjs/y-codemirror.next/issues/27 is resolved.
 *
 * Modifications compared to upstream:
 * - removed spurious mutex (https://github.com/yjs/y-codemirror.next/issues/15)
 * - added TypeScript types
 * - simplified `YUndoManagerConfig` by removing public methods
 * - moved `_onStackItemAdded`, `_onStackItemPopped` and `_storeSelection` definitions out of constructor
 */
import {
  EditorView,
  PluginValue,
  ViewPlugin,
  ViewUpdate
} from '@codemirror/view';
import { Facet } from '@codemirror/state';
import { YRange, ySyncAnnotation, YSyncConfig, ySyncFacet } from './ybinding';
import type { UndoManager } from 'yjs';

interface IStackItem {
  meta: Map<any, any>;
}

export class YUndoManagerConfig {
  constructor(undoManager: UndoManager) {
    this.undoManager = undoManager;
  }
  public undoManager: UndoManager;
}

export const yUndoManagerFacet = Facet.define<
  YUndoManagerConfig,
  YUndoManagerConfig
>({
  combine(inputs) {
    return inputs[inputs.length - 1];
  }
});

class YUndoManagerPluginValue implements PluginValue {
  constructor(view: EditorView) {
    this._view = view;
    this._conf = view.state.facet(yUndoManagerFacet);
    this._undoManager = this._conf.undoManager;
    this._syncConf = view.state.facet(ySyncFacet);
    this._beforeChangeSelection = null;
    this._undoManager.on('stack-item-added', this._onStackItemAdded);
    this._undoManager.on('stack-item-popped', this._onStackItemPopped);
    this._undoManager.addTrackedOrigin(this._syncConf);
  }
  _onStackItemAdded = ({
    stackItem,
    changedParentTypes
  }: {
    stackItem: IStackItem;
    changedParentTypes: Map<any, any>;
  }) => {
    // only store metadata if this type was affected
    if (
      changedParentTypes.has(this._syncConf.ytext) &&
      this._beforeChangeSelection &&
      !stackItem.meta.has(this)
    ) {
      // do not overwrite previous stored selection
      stackItem.meta.set(this, this._beforeChangeSelection);
    }
  };
  _onStackItemPopped = ({ stackItem }: { stackItem: IStackItem }) => {
    const sel = stackItem.meta.get(this);
    if (sel) {
      const selection = this._syncConf.fromYRange(sel);
      this._view.dispatch(
        this._view.state.update({
          selection,
          effects: [EditorView.scrollIntoView(selection)]
        })
      );
      this._storeSelection();
    }
  };
  _storeSelection = () => {
    // store the selection before the change is applied so we can restore it with the undo manager.
    this._beforeChangeSelection = this._syncConf.toYRange(
      this._view.state.selection.main
    );
  };
  update(update: ViewUpdate) {
    if (
      update.selectionSet &&
      (update.transactions.length === 0 ||
        update.transactions[0].annotation(ySyncAnnotation) !== this._syncConf)
    ) {
      // This only works when YUndoManagerPlugin is included before the sync plugin
      this._storeSelection();
    }
  }
  destroy() {
    this._undoManager.off('stack-item-added', this._onStackItemAdded);
    this._undoManager.off('stack-item-popped', this._onStackItemPopped);
    this._undoManager.removeTrackedOrigin(this._syncConf);
  }
  private _undoManager: UndoManager;
  private _view: EditorView;
  private _beforeChangeSelection: null | YRange;
  private _conf: YUndoManagerConfig;
  private _syncConf: YSyncConfig;
}
export const yUndoManager = ViewPlugin.fromClass(YUndoManagerPluginValue);
