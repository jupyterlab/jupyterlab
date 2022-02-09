// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { InputGroup, ReactWidget, UseSignal } from '@jupyterlab/ui-components';

import React, { useState } from 'react';

import { IDebugger } from '../../tokens';

/**
 * The class name added to the filebrowser crumbs node.
 */
export interface IFilterBoxProps {
  model: IDebugger.Model.IKernelSources;
}

const FilterBox = (props: IFilterBoxProps) => {
  const [filter, setFilter] = useState('');
  props.model.filterChanged.connect((_, filter) => {
    setFilter(filter);
  });
  const onFilterChange = (e: any) => {
    const filter = (e.target as HTMLInputElement).value;
    props.model.filter = filter;
    setFilter(filter);
  };
  return (
    <InputGroup
      type="text"
      onChange={onFilterChange}
      placeholder="Filter the kernel sources"
      value={filter}
    />
  );
};

/**
 * A widget which hosts a input textbox to filter on file names.
 */
export const KernelSourcesFilter = (props: IFilterBoxProps): ReactWidget => {
  return ReactWidget.create(
    <UseSignal
      signal={props.model.changed}
      initialArgs={props.model.kernelSources}
    >
      {model => <FilterBox model={props.model} />}
    </UseSignal>
  );
};
