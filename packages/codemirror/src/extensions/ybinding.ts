/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 *
 * Binding for yjs and codemirror
 *
 * It is a simplification of https://github.com/yjs/y-codemirror.next
 * licensed under MIT License by Kevin Jahns
 */
import {
  Annotation,
  EditorSelection,
  Extension,
  Facet,
  SelectionRange
} from '@codemirror/state';
import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import {
  yUndoManager,
  YUndoManagerConfig,
  yUndoManagerFacet
} from './yundomanager';
import type {
  RelativePosition,
  Text,
  Transaction,
  UndoManager,
  YTextEvent
} from 'yjs';
import {
  createAbsolutePositionFromRelativePosition,
  createRelativePositionFromJSON,
  createRelativePositionFromTypeIndex,
  relativePositionToJSON
} from 'yjs';

export type ID = {
  client: number;
  clock: number;
};

export type Position = {
  type: ID | null;
  tname: string | null;
  item: ID | null;
  assoc: number;
};

export type Range = {
  yanchor: Position;
  yhead: Position;
};

/**
 * Defines a range on text using relative positions that can be transformed back to
 * absolute positions. (https://docs.yjs.dev/api/relative-positions)
 */
export class YRange {
  /**
   * @param yanchor
   * @param yhead
   */
  constructor(
    public yanchor: RelativePosition,
    public yhead: RelativePosition
  ) {}

  /**
   * Convert the position to JSON
   */
  toJSON(): Range {
    return {
      yanchor: relativePositionToJSON(this.yanchor),
      yhead: relativePositionToJSON(this.yhead)
    };
  }

  /**
   * Convert a JSON range to a YRange
   * @param json Range to convert
   * @return The range as YRange
   */
  static fromJSON(json: Range): YRange {
    return new YRange(
      createRelativePositionFromJSON(json.yanchor),
      createRelativePositionFromJSON(json.yhead)
    );
  }
}

/**
 * Yjs binding configuration
 */
export class YSyncConfig {
  /**
   * Create a new binding configuration
   *
   * @param ytext Yjs text to synchronize
   */
  constructor(public ytext: Text) {}

  /**
   * Helper function to transform an absolute index position to a Yjs-based relative position
   * (https://docs.yjs.dev/api/relative-positions).
   *
   * A relative position can be transformed back to an absolute position even after the document has changed. The position is
   * automatically adapted. This does not require any position transformations. Relative positions are computed based on
   * the internal Yjs document model. Peers that share content through Yjs are guaranteed that their positions will always
   * synced up when using relative positions.
   *
   * ```js
   * import { ySyncFacet } from 'y-codemirror'
   *
   * ..
   * const ysync = view.state.facet(ySyncFacet)
   * // transform an absolute index position to a ypos
   * const ypos = ysync.getYPos(3)
   * // transform the ypos back to an absolute position
   * ysync.fromYPos(ypos) // => 3
   * ```
   *
   * It cannot be guaranteed that absolute index positions can be synced up between peers.
   * This might lead to undesired behavior when implementing features that require that all peers see the
   * same marked range (e.g. a comment plugin).
   *
   * @param pos
   * @param assoc
   */
  toYPos(pos: number, assoc = 0): RelativePosition {
    return createRelativePositionFromTypeIndex(this.ytext, pos, assoc);
  }

  /**
   * @param rpos
   */
  fromYPos(rpos: RelativePosition | Record<string, any>) {
    const pos = createAbsolutePositionFromRelativePosition(
      createRelativePositionFromJSON(rpos),
      this.ytext.doc!
    );
    if (pos == null || pos.type !== this.ytext) {
      throw new Error(
        '[y-codemirror] The position you want to retrieve was created by a different document'
      );
    }
    return {
      pos: pos.index,
      assoc: pos.assoc
    };
  }

  /**
   * @param range
   * @return
   */
  toYRange(range: SelectionRange): YRange {
    const assoc = range.assoc;
    const yanchor = this.toYPos(range.anchor, assoc);
    const yhead = this.toYPos(range.head, assoc);
    return new YRange(yanchor, yhead);
  }

  /**
   * @param yrange
   */
  fromYRange(yrange: YRange): SelectionRange {
    const anchor = this.fromYPos(yrange.yanchor);
    const head = this.fromYPos(yrange.yhead);
    if (anchor.pos === head.pos) {
      return EditorSelection.cursor(head.pos, head.assoc);
    }
    return EditorSelection.range(anchor.pos, head.pos);
  }
}

/**
 * Yjs binding facet
 */
export const ySyncFacet = Facet.define<YSyncConfig, YSyncConfig>({
  combine(inputs) {
    return inputs[inputs.length - 1];
  }
});

/**
 * Yjs binding annotation
 *
 * It is used to track the origin of the document changes
 */
export const ySyncAnnotation = Annotation.define<YSyncConfig>();

/**
 * Yjs binding view plugin to synchronize the
 * editor state with the Yjs document.
 */
export const ySync = ViewPlugin.fromClass(
  class {
    constructor(view: EditorView) {
      this.conf = view.state.facet(ySyncFacet);
      this._observer = (event: YTextEvent, tr: Transaction) => {
        if (tr.origin !== this.conf) {
          const delta = event.delta;
          const changes: any[] = [];
          let pos = 0;
          for (let i = 0; i < delta.length; i++) {
            const d = delta[i];
            if (d.insert != null) {
              changes.push({ from: pos, to: pos, insert: d.insert });
            } else if (d.delete != null) {
              changes.push({ from: pos, to: pos + d.delete, insert: '' });
              pos += d.delete;
            } else {
              pos += d.retain ?? 0;
            }
          }
          view.dispatch({
            changes,
            // Specified the changes origin to not loop when synchronizing
            annotations: [ySyncAnnotation.of(this.conf)]
          });
        }
      };
      this._ytext = this.conf.ytext;
      this._ytext.observe(this._observer);
    }

    update(update: ViewUpdate) {
      if (
        !update.docChanged ||
        (update.transactions.length > 0 &&
          update.transactions[0].annotation(ySyncAnnotation) === this.conf)
      ) {
        return;
      }

      const ytext = this.conf.ytext;
      ytext.doc!.transact(() => {
        /**
         * This variable adjusts the fromA position to the current position in the Y.Text type.
         */
        let adj = 0;
        update.changes.iterChanges((fromA, toA, fromB, toB, insert) => {
          const insertText = insert.sliceString(0, insert.length, '\n');
          if (fromA !== toA) {
            ytext.delete(fromA + adj, toA - fromA);
          }
          if (insertText.length > 0) {
            ytext.insert(fromA + adj, insertText);
          }
          adj += insertText.length - (toA - fromA);
        });
        // Set the configuration as origin to not loop when synchronizing
      }, this.conf);
    }

    destroy() {
      this._ytext.unobserve(this._observer);
    }

    conf: YSyncConfig;
    _observer: (event: YTextEvent, tr: Transaction) => void;
    _ytext: Text;
  }
);

/**
 * Extension for CodeMirror 6 binding the Yjs text (source of truth)
 * and the editor state.
 *
 * @param ytext Yjs text to bind
 * @param undoManager Yjs text undo manager
 * @returns CodeMirror 6 extension
 */
export function ybinding({
  ytext,
  undoManager
}: {
  ytext: Text;
  undoManager?: UndoManager;
}): Extension {
  const ySyncConfig = new YSyncConfig(ytext);
  const plugins = [ySyncFacet.of(ySyncConfig), ySync];
  if (undoManager) {
    plugins.push(
      // We need to add a new origin to the undo manager to ensure text updates
      // are tracked; we also need to restore selection after undo/redo.
      yUndoManagerFacet.of(new YUndoManagerConfig(undoManager)),
      yUndoManager
    );
  }
  return plugins;
}
