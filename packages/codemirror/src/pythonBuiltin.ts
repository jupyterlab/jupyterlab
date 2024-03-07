/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { Language, syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate
} from '@codemirror/view';
import { NodeProp, SyntaxNodeRef, Tree } from '@lezer/common';

export class PythonBuiltin {
  decorations: DecorationSet;
  decoratedTo: number;
  langPython: Language;
  tree: Tree;
  mark: Decoration;

  constructor(view: EditorView, langPython: Language) {
    this.langPython = langPython;
    this.tree = syntaxTree(view.state);
    this.mark = Decoration.mark({ class: 'cm-builtin' });
    this.decorations = this.buildDeco(view);
    this.decoratedTo = view.viewport.to;
  }

  update(update: ViewUpdate) {
    let tree = syntaxTree(update.state);
    let { viewport } = update.view,
      decoratedToMapped = update.changes.mapPos(this.decoratedTo, 1);
    if (
      tree.length < viewport.to &&
      tree.type == this.tree.type &&
      decoratedToMapped >= viewport.to
    ) {
      this.decorations = this.decorations.map(update.changes);
      this.decoratedTo = decoratedToMapped;
    } else if (tree != this.tree || update.viewportChanged) {
      this.tree = tree;
      this.decorations = this.buildDeco(update.view);
      this.decoratedTo = viewport.to;
    }
  }

  buildDeco(view: EditorView) {
    if (!this.tree.length) return Decoration.none;

    let builder = new RangeSetBuilder<Decoration>();
    const enter = (node: SyntaxNodeRef) => {
      const cursor = node.node.cursor();
      // Handle nested language, e.g. Markdown
      const mounted = cursor.tree && cursor.tree.prop(NodeProp.mounted);
      if (mounted && mounted.overlay) {
        node.node
          .enter(mounted.overlay[0].from + node.from, 1)
          ?.cursor()
          .iterate(enter);
      }
      if (
        this.langPython.isActiveAt(view.state, node.from + 1) &&
        node.name === 'VariableName'
      ) {
        const variableName = view.state.sliceDoc(node.from, node.to);
        if (builtins.includes(variableName)) {
          builder.add(node.from, node.to, this.mark);
        }
      }
    };
    for (let { from, to } of view.visibleRanges) {
      this.tree.iterate({ enter, from, to });
    }
    return builder.finish();
  }
}

export function pythonBuiltin(langPython: Language) {
  return ViewPlugin.define(view => new PythonBuiltin(view, langPython), {
    decorations: v => v.decorations
  });
}

const builtins = [
  'abs',
  'aiter',
  'all',
  'any',
  'anext',
  'ascii',
  'bin',
  'bool',
  'breakpoint',
  'bytearray',
  'bytes',
  'callable',
  'chr',
  'classmethod',
  'compile',
  'complex',
  'delattr',
  'dict',
  'dir',
  'divmod',
  'enumerate',
  'eval',
  'exec',
  'filter',
  'float',
  'format',
  'frozenset',
  'getattr',
  'globals',
  'hasattr',
  'hash',
  'help',
  'hex',
  'id',
  'input',
  'int',
  'isinstance',
  'issubclass',
  'iter',
  'len',
  'list',
  'locals',
  'map',
  'max',
  'memoryview',
  'min',
  'next',
  'object',
  'oct',
  'open',
  'ord',
  'pow',
  'print',
  'property',
  'range',
  'repr',
  'reversed',
  'round',
  'set',
  'setattr',
  'slice',
  'sorted',
  'staticmethod',
  'str',
  'sum',
  'super',
  'tuple',
  'type',
  'vars',
  'zip',
  '__import__'
];
