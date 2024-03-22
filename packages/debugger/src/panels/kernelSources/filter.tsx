// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { InputGroup, UseSignal } from '@jupyterlab/ui-components';

import React from 'react';

import { IDebugger } from '../../tokens';

/**
 * The class name added to the filebrowser crumbs node.
 */
export interface IFilterBoxProps {
  model: IDebugger.Model.IKernelSources;
}

const FilterBox = (props: IFilterBoxProps) => {
  const onFilterChange = (e: any) => {
    const filter = (e.target as HTMLInputElement).value;
    props.model.filter = filter;
  };
  return (
    <InputGroup
      type="text"
      onChange={onFilterChange}
      placeholder="Filter the kernel sources"
      value={props.model.filter}
    />
  );
};

/**
 * A widget which hosts a input textbox to filter on file names.
 */
export const KernelSourcesFilter = (props: IFilterBoxProps) => {
  return (
    <UseSignal
      signal={props.model.filterChanged}
      initialArgs={props.model.filter}
    >
      {model => <FilterBox model={props.model} />}
    </UseSignal>
  );
};
