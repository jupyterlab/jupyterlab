/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { Dialog, VDomModel, VDomRenderer } from '@jupyterlab/apputils';
import { CodeCell } from '@jupyterlab/cells';
import { CellTag, INotebookModel, Notebook } from '@jupyterlab/notebook';
import { ITranslator } from '@jupyterlab/translation';
import { JSONExt } from '@lumino/coreutils';
import React from 'react';

/**
 * CellFiltersComponent properties
 */
interface ICellFiltersComponentProps {
  /**
   * Filters
   */
  filters: Set<string>;
  /**
   * Set new filters
   *
   * @param f New filters
   */
  setFilters: (f: Set<string>) => void;
  /**
   * Cell tags used in the notebook
   */
  tags: Set<string>;
  /**
   * Cell types used in the notebook
   */
  types: Set<string>;
  /**
   * Application translator
   */
  translator: ITranslator;
}

/**
 * Display checkboxes to select cell filters.
 */
function CellFiltersComponent(props: ICellFiltersComponentProps): JSX.Element {
  const { filters, setFilters, tags, translator, types } = props;

  const trans = translator.load('jupyterlab');

  const handleCheck = (item: string) => {
    const newFilters = new Set<string>(filters);
    if (filters.has(item)) {
      newFilters.delete(item);
    } else {
      newFilters.add(item);
    }
    setFilters(newFilters);
  };

  return (
    <>
      {types.size ? (
        <fieldset className="jp-cell-filters-types">
          <legend>{trans.__('Cell types')}</legend>
          <div style={{ marginBottom: '10px' }}>
            Select below the type of cells used for filtering. Cells that{' '}
            <b> do not have </b> this type will be collapsed
          </div>
          {[...types].map(item => {
            return (
              <label key={item}>
                <input
                  type="radio"
                  name="cell-type"
                  onChange={() => {
                    handleCheck(item);
                  }}
                  checked={filters.has(item)}
                />
                {item}
              </label>
            );
          })}
          <label key={'any'}>
            <input
              type="radio"
              name="cell-type"
              onChange={() => {
                const newFilters = new Set<string>(filters);
                for (const item of types) {
                  if (filters.has(item)) {
                    newFilters.delete(item);
                  }
                }
                setFilters(newFilters);
              }}
              checked={[...filters].reduce(
                (agg, f) => agg && !types.has(f),
                true
              )}
            />
            {trans.__('any type')}
          </label>
        </fieldset>
      ) : null}
      {tags.size ? (
        <fieldset>
          <legend>{trans.__('Cell tags')}</legend>

          <ul className="jp-cell-filters-tags">
            <div style={{ marginBottom: '10px' }}>
              Select below the tags used for filtering. Cells that{' '}
              <b> do not have </b> those tags will be collapsed
            </div>
            {[...tags].map(item => {
              return (
                <li key={item}>
                  <CellTag
                    key={item}
                    checked={filters.has(item)}
                    onChange={() => {
                      handleCheck(item);
                    }}
                    tag={item}
                  ></CellTag>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : null}
    </>
  );
}

/**
 * Cell filters model
 */
export class CellFiltersModel extends VDomModel {
  private _notebook: Notebook;
  private _filters = new Set<string>();

  constructor({ notebook }: { notebook: Notebook }) {
    super();
    this._notebook = notebook;
  }

  /**
   * Cell types used by the notebook
   */
  get cellTypes(): Set<string> {
    const types = new Set<string>();
    if (!this._model) {
      return types;
    }
    for (let cellIdx = 0; cellIdx < this._model.cells.length; cellIdx++) {
      const cellModel = this._model.cells.get(cellIdx);
      types.add(cellModel.type);
    }
    return types;
  }

  /**
   * Latest cell filters applied
   */
  get filters(): Set<string> {
    return this._filters;
  }
  set filters(v: Set<string>) {
    if (!JSONExt.deepEqual([...this._filters], [...v])) {
      this._filters = v;
      this._applyFilters();
    }
  }

  /**
   * Cell tags defined in the notebook
   */
  get tags(): Set<string> {
    const tags = new Set<string>();
    if (!this._model) {
      return tags;
    }
    for (let cellIdx = 0; cellIdx < this._model.cells.length; cellIdx++) {
      const cellModel = this._model.cells.get(cellIdx);
      ((cellModel.getMetadata('tags') ?? []) as string[]).forEach(tag => {
        tags.add(tag);
      });
    }
    return tags;
  }

  private get _model(): INotebookModel | null {
    return this._notebook.model;
  }

  /**
   * Check is the cells of the input notebook have to be filtered
   * Update the hidden cells state
   */
  private _applyFilters() {
    this._notebook.widgets.forEach(cell => {
      const cellTagList = new Set<string>(
        (cell.model.getMetadata('tags') ?? []).concat(cell.model.type)
      );
      // IsTagFiltered is true when the list of tags of a cell includes
      // at least one the checked tags
      const isTagFiltered = this._isSubset(cellTagList, this._filters);

      if (isTagFiltered === false && cell.inputHidden === false) {
        cell.inputHidden = true;
        if (cell instanceof CodeCell) {
          cell.outputHidden = true;
        }
      }
      if (isTagFiltered === true && cell.inputHidden === true) {
        cell.inputHidden = false;
        if (cell instanceof CodeCell) {
          cell.outputHidden = false;
        }
      }
    });
  }

  /**
   * Check if `subset` is included into another one
   * return true if that's the case
   */
  private _isSubset(mainSet: Set<string>, subset: Set<string>): boolean {
    const isIncluded: boolean[] = [];
    subset.forEach(item => {
      isIncluded.push(mainSet.has(item));
    });
    return isIncluded.every(item => item);
  }
}

/**
 * Cell filters view
 *
 * @alpha It may change to avoid using dialog in inspector property panel.
 */
export class CellFiltersView
  extends VDomRenderer<CellFiltersModel>
  implements Dialog.IBodyWidget<Set<string>>
{
  constructor({
    model,
    translator
  }: {
    model: CellFiltersModel;
    translator: ITranslator;
  }) {
    super(model);
    this._filters = model.filters;
    this._translator = translator;
  }

  /**
   * Returns the filters defined in the view.
   *
   * @returns Filters
   */
  getValue(): Set<string> {
    return this._filters;
  }

  render() {
    return (
      <CellFiltersComponent
        filters={this._filters}
        setFilters={(f: Set<string>) => {
          this._filters = f;
          this.update();
        }}
        tags={this.model.tags}
        types={this.model.cellTypes}
        translator={this._translator}
      />
    );
  }

  private _filters: Set<string>;
  private _translator: ITranslator;
}
