// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ILSPCodeExtractorsManager } from '../tokens';
import { IForeignCodeExtractor } from './types';

/**
 * Manager for the code extractors
 */
export class CodeExtractorsManager implements ILSPCodeExtractorsManager {
  constructor() {
    this._extractorMap = new Map<
      string,
      Map<string, IForeignCodeExtractor[]>
    >();

    this._extractorMapAnyLanguage = new Map<string, IForeignCodeExtractor[]>();
  }

  /**
   * Get the extractors for the input cell type and the main language of
   * the document
   *
   * @param  cellType - type of cell
   * @param  hostLanguage - main language of the document
   */
  getExtractors(
    cellType: string,
    hostLanguage: string | null
  ): IForeignCodeExtractor[] {
    if (hostLanguage) {
      const currentMap = this._extractorMap.get(cellType);
      if (!currentMap) {
        return [];
      }
      return currentMap!.get(hostLanguage) ?? [];
    } else {
      return this._extractorMapAnyLanguage.get(cellType) ?? [];
    }
  }

  /**
   * Register an extractor to extract foreign code from host documents of specified language.
   */
  register(
    extractor: IForeignCodeExtractor,
    hostLanguage: string | null
  ): void {
    const cellType = extractor.cellType;
    if (hostLanguage) {
      cellType.forEach(type => {
        if (!this._extractorMap.has(type)) {
          this._extractorMap.set(type, new Map());
        }
        const currentMap = this._extractorMap.get(type)!;
        const extractorList = currentMap.get(hostLanguage);
        if (!extractorList) {
          currentMap.set(hostLanguage, [extractor]);
        } else {
          extractorList.push(extractor);
        }
      });
    } else {
      cellType.forEach(type => {
        if (!this._extractorMapAnyLanguage.has(type)) {
          this._extractorMapAnyLanguage.set(type, []);
        }
        this._extractorMapAnyLanguage.get(type)!.push(extractor);
      });
    }
  }

  /**
   * The map with key is the type of cell, value is another map between
   * the language of cell and its code extractor.
   */
  private _extractorMap: Map<string, Map<string, IForeignCodeExtractor[]>>;

  /**
   * The map with key is the cell type, value is the code extractor associated
   * with this cell type, this is used for the non-code cell types.
   */
  private _extractorMapAnyLanguage: Map<string, IForeignCodeExtractor[]>;
}
