import { pythonLanguage } from '@codemirror/lang-python';
import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewUpdate } from '@codemirror/view';
import { Tree } from '@lezer/common';

export class PythonBuiltin {
  decorations: DecorationSet
  decoratedTo: number
  tree: Tree
  enabled: boolean

  constructor(view: EditorView) {
    this.tree = syntaxTree(view.state)
    this.decorations = this.buildDeco(view)
    this.decoratedTo = view.viewport.to
  }

  update(update: ViewUpdate) {
    let tree = syntaxTree(update.state)
    let { viewport } = update.view, decoratedToMapped = update.changes.mapPos(this.decoratedTo, 1)
    if (tree.length < viewport.to && tree.type == this.tree.type && decoratedToMapped >= viewport.to) {
      this.decorations = this.decorations.map(update.changes)
      this.decoratedTo = decoratedToMapped
    } else if (tree != this.tree || update.viewportChanged) {
      this.tree = tree
      this.decorations = this.buildDeco(update.view)
      this.decoratedTo = viewport.to
    }
  }

  buildDeco(view: EditorView) {
    if (!this.tree.length) return Decoration.none

    let builder = new RangeSetBuilder<Decoration>()
    for (let { from, to } of view.visibleRanges) {
      this.tree.iterate({
        enter(node) {
          if (node.name !== "VariableName") return
          if (!pythonLanguage.isActiveAt(view.state, node.from)) return
          const variableName = view.state.sliceDoc(node.from, node.to)
          if (builtins.includes(variableName)) {
            builder.add(node.from, node.to, Decoration.mark({ class: "cm-builtin" }))
          }
        },
        from, to
      })
    }
    return builder.finish()
  }
}

const builtins = [
  "abs", "aiter", "all", "any", "anext", "ascii", "bin", "bool",
  "breakpoint", "bytearray", "bytes", "callable", "chr", "classmethod",
  "compile", "complex", "delattr", "dict", "dir", "divmod", "enumerate",
  "eval", "exec", "filter", "float", "format", "frozenset", "getattr",
  "globals", "hasattr", "hash", "help", "hex", "id", "input", "int",
  "isinstance", "issubclass", "iter", "len", "list", "locals", "map",
  "max", "memoryview", "min", "next", "object", "oct", "open", "ord",
  "pow", "print", "property", "range", "repr", "reversed", "round", "set",
  "setattr", "slice", "sorted", "staticmethod", "str", "sum", "super",
  "tuple", "type", "vars", "zip", "__import__"
]
