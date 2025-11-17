// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React, { useState } from 'react';

import {
  caretDownIcon,
  caretRightIcon,
  classes,
  LabIcon,
  openKernelSourceIcon,
  ReactWidget
} from '@jupyterlab/ui-components';

import { showErrorMessage } from '@jupyterlab/apputils';

import { ITranslator, nullTranslator } from '@jupyterlab/translation';

import { KernelSourcesFilter } from './filter';

import { IDebugger } from '../../tokens';
import { UseSignal } from '@jupyterlab/ui-components';
import { IRenderMime } from '@jupyterlab/rendermime';

/**
 * CSS class names.
 */
const FILTERBOX_CLASS = 'jp-DebuggerKernelSource-filterBox';
const FILTERBOX_HIDDEN_CLASS = 'jp-DebuggerKernelSource-filterBox-hidden';
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
}

/**
 * Recursive component for rendering a tree node (directory or file).
 */
function TreeNode(props: ITreeNodeProps): JSX.Element {
  const { name, path, moduleName, children, onOpen } = props;
  const [isOpen, setIsOpen] = useState(false);

  const isDirectory = !!children && children.length > 0;

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

  const handleClick = (): void => {
    if (isDirectory) {
      setIsOpen(!isOpen);
    } else {
      onOpen(path);
    }
  };

  return (
    <div className={isDirectory ? DIR_CLASS : SOURCE_CLASS} title={path}>
      <div className="jp-DebuggerKernelSource-item" onClick={handleClick}>
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
            <TreeNode key={i} {...child} onOpen={onOpen} />
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
  const root: Record<string, any> = {};

  for (const mod of modules) {
    const sep = mod.name.includes('.') && !mod.name.includes('/') ? '.' : '/';
    const parts = mod.name.split(sep);
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      if (!current[part]) {
        current[part] = {
          __children__: {},
          __namePath__: parts.slice(0, i + 1).join(sep),
          __filePath__: mod.path,
          __moduleName__: mod.name
        };
      }
      current = current[part].__children__;
    }
  }

  function toArray(node: Record<string, any>): ITreeNodeProps[] {
    const entries = Object.keys(node).map(name => {
      const entry = node[name];
      const children = toArray(entry.__children__);
      return {
        name,
        path: entry.__filePath__,
        moduleName: entry.__moduleName__,
        children: children.length ? children : undefined,
        onOpen: () => undefined
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
    let filterClass = FILTERBOX_CLASS;
    if (!this._showFilter) {
      filterClass += ' ' + FILTERBOX_HIDDEN_CLASS;
    }
    return (
      <React.Fragment>
        <div className={filterClass} key={'filter'}>
          <KernelSourcesFilter model={this._model} trans={this._trans} />
        </div>
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
            return (
              <div>
                {tree.map((node, i) => (
                  <TreeNode key={i} {...node} onOpen={handleOpen} />
                ))}
              </div>
            );
          }}
        </UseSignal>
      </React.Fragment>
    );
  }

  /**
   * Show or hide the filter box.
   */
  public toggleFilterbox(): void {
    this._showFilter = !this._showFilter;
    this.update();
  }

  private _model: IDebugger.Model.IKernelSources;
  private _debuggerService: IDebugger;
  private _trans: IRenderMime.TranslationBundle;
  private _showFilter = false;
}

/**
 * A namespace for SourcesBody `statics`.
 */
export namespace KernelSourcesBody {
  /**
   * Instantiation options for `Breakpoints`.
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
