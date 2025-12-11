// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React, { useState } from 'react';

import {
  caretDownIcon,
  caretRightIcon,
  classes,
  LabIcon,
  openKernelSourceIcon,
  ReactWidget,
  UseSignal
} from '@jupyterlab/ui-components';

import { showErrorMessage } from '@jupyterlab/apputils';

import { ITranslator, nullTranslator } from '@jupyterlab/translation';

import { IDebugger } from '../../tokens';
import { IRenderMime } from '@jupyterlab/rendermime';

/**
 * CSS class names.
 */
const SOURCE_CLASS = 'jp-DebuggerKernelSource-source';
const DIR_CLASS = 'jp-DebuggerKernelSource-dir';

/**
 * Props for a tree node.
 */
interface ITreeNodeProps {
  name: string;
  path: string;
  moduleName: string;
  children?: ITreeNodeProps[];
  onOpen: (path: string) => void;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

interface IRawNode {
  children: Record<string, IRawNode>;
  namePath: string;
  filePath: string;
  moduleName: string;
}

/**
 * Recursive component for rendering a tree node (directory or file).
 */
function TreeNode(props: ITreeNodeProps): JSX.Element {
  const { name, path, moduleName, children, onOpen, selectedPath, onSelect } =
    props;

  const [isOpen, setIsOpen] = useState(false);

  const isDirectory = !!children && children.length > 0;
  const isSelected = selectedPath === path;

  // Compute collapsed chain dynamically (only when expanded)
  let displayName = name;
  let displayChildren = children;

  if (isOpen && isDirectory) {
    const chain: string[] = [name];
    let currentChildren = children;

    // collapse linear folder chains dynamically
    while (
      currentChildren &&
      currentChildren.length === 1 &&
      currentChildren[0].children &&
      currentChildren[0].children!.length > 0
    ) {
      const next = currentChildren[0];
      chain.push(next.name);
      currentChildren = next.children ?? [];
    }

    if (chain.length > 1) {
      // Infer separator from first child's moduleName if available
      const childModuleName = currentChildren?.[0]?.moduleName ?? moduleName;
      const sep =
        childModuleName.includes('.') && !childModuleName.includes('/')
          ? '.'
          : '/';
      displayName = chain.join(sep);
      displayChildren = currentChildren;
    }
  }

  const handleClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    onSelect(path);

    if (isDirectory) {
      setIsOpen(!isOpen);
    } else {
      onOpen(path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent): void => {
    onSelect(path);
  };

  return (
    <div className={isDirectory ? DIR_CLASS : SOURCE_CLASS} title={path}>
      <div
        className={classes(
          'jp-DebuggerKernelSource-item',
          isSelected && 'jp-DebuggerKernelSource-itemSelected'
        )}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <LabIcon.resolveReact
          icon={
            isDirectory
              ? isOpen
                ? caretDownIcon
                : caretRightIcon
              : openKernelSourceIcon
          }
          className={classes('jp-Icon')}
          tag={null}
        />
        <span className="jp-DebuggerKernelSource-label">{displayName}</span>
      </div>
      {isDirectory && isOpen && displayChildren && (
        <div className="jp-DebuggerKernelSource-children">
          {displayChildren.map((child, i) => (
            <TreeNode
              key={i}
              {...child}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Convert a flat list of kernel sources into a hierarchical directory tree.
 */
function buildTree(modules: IDebugger.KernelSource[]): ITreeNodeProps[] {
  const root: Record<string, IRawNode> = {};

  for (const mod of modules) {
    const sep = mod.name.includes('.') && !mod.name.includes('/') ? '.' : '/';
    const parts = mod.name.split(sep);
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      if (!current[part]) {
        current[part] = {
          children: {},
          namePath: parts.slice(0, i + 1).join(sep),
          filePath: mod.path,
          moduleName: mod.name
        };
      }
      current = current[part].children;
    }
  }

  function toArray(node: Record<string, any>): ITreeNodeProps[] {
    const entries = Object.keys(node).map(name => {
      const entry = node[name];
      const children = toArray(entry.children);
      return {
        name,
        path: entry.filePath,
        moduleName: entry.moduleName,
        children: children.length ? children : undefined,
        onOpen: () => undefined,
        selectedPath: null,
        onSelect: () => undefined
      };
    });

    // Sort: directories first, then files
    entries.sort((a, b) => {
      const aDir = !!a.children;
      const bDir = !!b.children;
      if (aDir !== bDir) return aDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return entries;
  }

  return toArray(root);
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
      <React.Fragment>
        <UseSignal signal={this._model.changed}>
          {(_, kernelSources) => {
            const tree = buildTree(kernelSources ?? []);
            const handleOpen = (path: string): void => {
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

            const handleSelect = (path: string): void => {
              this._selectedPath = path;
              this.update();
            };

            return (
              <div>
                {tree.map((node, i) => (
                  <TreeNode
                    key={i}
                    {...node}
                    onOpen={handleOpen}
                    selectedPath={this._selectedPath}
                    onSelect={handleSelect}
            const keymap: { [key: string]: number } = {};
            const filtered = kernelSources ?? [];

            return filtered.map(module => {
              const name = module.name;
              const path = module.path;
              const key =
                name + (keymap[name] = (keymap[name] ?? 0) + 1).toString();
              return (
                <div
                  key={key}
                  title={path}
                  className={SOURCE_CLASS}
                  onClick={() => {
                    this._debuggerService
                      .getSource({
                        sourceReference: 0,
                        path: path
                      })
                      .then(source => {
                        this._model.open(source);
                      })
                      .catch(reason => {
                        void showErrorMessage(
                          this._trans.__('Fail to get source'),
                          this._trans.__(
                            "Fail to get '%1' source:\n%2",
                            path,
                            reason
                          )
                        );
                      });
                  }}
                >
                  <LabIcon.resolveReact
                    icon={openKernelSourceIcon}
                    iconClass={classes('jp-Icon')}
                    tag={null}
                  />
                ))}
              </div>
            );
          }}
        </UseSignal>
      </React.Fragment>
    );
  }

  private _model: IDebugger.Model.IKernelSources;
  private _debuggerService: IDebugger;
  private _trans: IRenderMime.TranslationBundle;
  private _showFilter = false;
  private _selectedPath: string | null = null;
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
