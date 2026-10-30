// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React, { useMemo, useState } from 'react';

import {
  caretDownIcon,
  caretRightIcon,
  classes,
  openKernelSourceIcon,
  ReactWidget,
  UseSignal
} from '@jupyterlab/ui-components';

import { showErrorMessage } from '@jupyterlab/apputils';

import type { ITranslator } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';

import type { IDebugger } from '../../tokens';
import type { IRenderMime } from '@jupyterlab/rendermime';

/**
 * The class for each row of the tree.
 */
const ITEM_CLASS = 'jp-DebuggerKernelSource-item';

/**
 * The class for each source row.
 */
const SOURCE_CLASS = 'jp-DebuggerKernelSource-source';

/**
 * The class for each directory, wrapping its row and its children.
 */
const DIRECTORY_CLASS = 'jp-DebuggerKernelSource-dir';

/**
 * The class for the children of a directory.
 */
const CHILDREN_CLASS = 'jp-DebuggerKernelSource-children';

/**
 * The class for the label of a row.
 */
const LABEL_CLASS = 'jp-DebuggerKernelSource-label';

/**
 * The class for a selected row.
 */
const SELECTED_CLASS = 'jp-mod-selected';

/**
 * A node of the kernel sources tree.
 */
interface IKernelSourceNode {
  /**
   * A part of a module name, or a segment of a path.
   */
  name: string;

  /**
   * The separator between the name of the parent node and this name.
   */
  separator: string;

  /**
   * The path of the source of this node, if it is a source.
   */
  path: string | null;

  /**
   * The child nodes, directories first.
   */
  children: IKernelSourceNode[];
}

/**
 * Props shared by the components of the tree.
 */
interface ITreeProps {
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onOpen: (path: string) => void;
}

/**
 * A row of the tree that opens a source.
 */
function KernelSourceItem(
  props: ITreeProps & { label: string; path: string }
): JSX.Element {
  const { label, path, selectedPath, onSelect, onOpen } = props;
  return (
    <div
      className={classes(
        ITEM_CLASS,
        SOURCE_CLASS,
        path === selectedPath && SELECTED_CLASS
      )}
      title={path}
      onClick={() => {
        onSelect(path);
        onOpen(path);
      }}
      onContextMenu={() => onSelect(path)}
    >
      <openKernelSourceIcon.react tag={null} />
      <span className={LABEL_CLASS}>{label}</span>
    </div>
  );
}

/**
 * A collapsible directory of the tree.
 *
 * Once expanded, directories that only contain one directory are merged
 * into a single row.
 */
function KernelSourceDirectory(
  props: ITreeProps & { node: IKernelSourceNode }
): JSX.Element {
  const { node, ...treeProps } = props;
  const [expanded, setExpanded] = useState(false);

  let label = node.name;
  let contents = node;
  while (
    expanded &&
    contents.path === null &&
    contents.children.length === 1 &&
    contents.children[0].children.length > 0
  ) {
    contents = contents.children[0];
    label += contents.separator + contents.name;
  }

  return (
    <div className={DIRECTORY_CLASS}>
      <div className={ITEM_CLASS} onClick={() => setExpanded(!expanded)}>
        {expanded ? (
          <caretDownIcon.react tag={null} />
        ) : (
          <caretRightIcon.react tag={null} />
        )}
        <span className={LABEL_CLASS}>{label}</span>
      </div>
      {expanded && (
        <div className={CHILDREN_CLASS}>
          {contents.path !== null && (
            <KernelSourceItem
              {...treeProps}
              label={Private.basename(contents.path)}
              path={contents.path}
            />
          )}
          <KernelSourceNodes {...treeProps} nodes={contents.children} />
        </div>
      )}
    </div>
  );
}

/**
 * A list of sibling nodes of the tree.
 */
function KernelSourceNodes(
  props: ITreeProps & { nodes: IKernelSourceNode[] }
): JSX.Element {
  const { nodes, ...treeProps } = props;
  return (
    <>
      {nodes.map(node =>
        node.children.length > 0 || node.path === null ? (
          <KernelSourceDirectory key={node.name} {...treeProps} node={node} />
        ) : (
          <KernelSourceItem
            key={node.name}
            {...treeProps}
            label={node.name}
            path={node.path}
          />
        )
      )}
    </>
  );
}

/**
 * The tree of kernel sources.
 */
function KernelSourcesTree(props: {
  kernelSources: IDebugger.KernelSource[];
  onOpen: (path: string) => void;
}): JSX.Element {
  const { kernelSources, onOpen } = props;
  const nodes = useMemo(
    () => Private.buildTree(kernelSources),
    [kernelSources]
  );
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  return (
    <KernelSourceNodes
      nodes={nodes}
      selectedPath={selectedPath}
      onSelect={setSelectedPath}
      onOpen={onOpen}
    />
  );
}

/**
 * The body for a Sources Panel.
 */
export class KernelSourcesBody extends ReactWidget {
  /**
   * Instantiate a new Body for the KernelSourcesBody widget.
   *
   * @param options The instantiation options for a KernelSourcesBody.
   */
  constructor(options: KernelSourcesBody.IOptions) {
    super();
    this._model = options.model;
    this._debuggerService = options.service;
    this._trans = (options.translator ?? nullTranslator).load('jupyterlab');

    this.addClass('jp-DebuggerKernelSources-body');
  }

  render() {
    return (
      <UseSignal signal={this._model.changed}>
        {(_, kernelSources) => (
          <KernelSourcesTree
            kernelSources={kernelSources ?? []}
            onOpen={this._openSource}
          />
        )}
      </UseSignal>
    );
  }

  private _openSource = (path: string): void => {
    this._debuggerService
      .getSource({ sourceReference: 0, path })
      .then(source => this._model.open(source))
      .catch(reason => {
        void showErrorMessage(
          this._trans.__('Fail to get source'),
          this._trans.__("Fail to get '%1' source:\n%2", path, reason)
        );
      });
  };

  private _model: IDebugger.Model.IKernelSources;
  private _debuggerService: IDebugger;
  private _trans: IRenderMime.TranslationBundle;
}

/**
 * A namespace for SourcesBody `statics`.
 */
export namespace KernelSourcesBody {
  /**
   * Instantiation options for `KernelSourcesBody`.
   */
  export interface IOptions {
    /**
     * The debug service.
     */
    service: IDebugger;

    /**
     * The sources model.
     */
    model: IDebugger.Model.IKernelSources;

    /**
     * The application language translator
     */
    translator?: ITranslator;
  }
}

/**
 * A namespace for private module data.
 */
namespace Private {
  /**
   * Get the file name of a path.
   */
  export function basename(path: string): string {
    return path.split(/[\\/]/).pop() ?? path;
  }

  /**
   * Split the name of a kernel source into the names of its tree nodes.
   *
   * Dotted names are split as module names only when the source path
   * matches them, so that a file name such as `module.cpp` stays whole.
   */
  function splitName(source: IDebugger.KernelSource): {
    names: string[];
    separator: string;
  } {
    const { name, path } = source;
    const pathSeparator = /[\\/]/.exec(name);
    if (pathSeparator) {
      return {
        names: name.split(/[\\/]/).filter(part => part !== ''),
        separator: pathSeparator[0]
      };
    }
    const names = name.split('.');
    const modulePath = `/${path.replace(/\\/g, '/')}`.replace(
      /(?:\/__init__)?\.[^./]*$/,
      ''
    );
    return {
      names: modulePath.endsWith(`/${names.join('/')}`) ? names : [name],
      separator: '.'
    };
  }

  /**
   * A tree node being built, with its children indexed by name.
   */
  interface IPartialNode {
    separator: string;
    path: string | null;
    children: Map<string, IPartialNode>;
  }

  /**
   * Convert built nodes into tree nodes, directories first.
   */
  function toNodes(
    partialNodes: Map<string, IPartialNode>
  ): IKernelSourceNode[] {
    const nodes = Array.from(partialNodes, ([name, partialNode]) => ({
      name,
      separator: partialNode.separator,
      path: partialNode.path,
      children: toNodes(partialNode.children)
    }));
    return nodes.sort((a, b) => {
      const aIsDirectory = a.children.length > 0;
      const bIsDirectory = b.children.length > 0;
      if (aIsDirectory !== bIsDirectory) {
        return aIsDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Convert a flat list of kernel sources into a tree.
   */
  export function buildTree(
    kernelSources: IDebugger.KernelSource[]
  ): IKernelSourceNode[] {
    const root = new Map<string, IPartialNode>();
    for (const source of kernelSources) {
      const { names, separator } = splitName(source);
      let siblings = root;
      let node: IPartialNode | undefined;
      for (const name of names) {
        node = siblings.get(name);
        if (!node) {
          node = { separator, path: null, children: new Map() };
          siblings.set(name, node);
        }
        siblings = node.children;
      }
      if (node && node.path === null) {
        node.path = source.path;
      }
    }
    return toNodes(root);
  }
}
