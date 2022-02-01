// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget, UseSignal } from '@jupyterlab/apputils';

import { InputGroup } from '@jupyterlab/ui-components';

import React from 'react';

import { IDebugger } from '../../tokens';

/**
 * The class name added to the filebrowser crumbs node.
 */
export interface IFilterBoxProps {
  model: IDebugger.Model.IKernelSources;
  onFilterChange?: (e: any) => void;
}

const FilterBox = (props: IFilterBoxProps) => {
  return (
    <InputGroup
      type="text"
      onChange={props.onFilterChange}
      placeholder="Filter the kernel sources"
      value={props.model.filter}
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
      {model => (
        <FilterBox
          model={props.model}
          onFilterChange={(e: any) => {
            props.model.filter = (e.target as HTMLInputElement).value;
          }}
        />
      )}
    </UseSignal>
  );
};
