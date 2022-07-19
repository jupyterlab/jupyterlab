import { CellType } from '@jupyterlab/nbformat';

import { ILSPCodeExtractorsManager } from '../tokens';
import { IForeignCodeExtractor } from './types';

/**
 * Manager for the code extractors
 */
export class CodeExtractorsManager implements ILSPCodeExtractorsManager {
  constructor() {
    this._extractorMap = new Map<
      CellType,
      Map<string, IForeignCodeExtractor[]>
    >();

    this._extractorMapAnyLanguage = new Map<
      CellType,
      IForeignCodeExtractor[]
    >();

    (['code', 'markdown', 'raw'] as CellType[]).forEach(cell => {
      this._extractorMap.set(cell, new Map());
      this._extractorMapAnyLanguage.set(cell, []);
    });
  }

  /**
   * Get the extractors for the input cell type and the main language of
   * the document
   *
   * @param {CellType} cellType
   * @param {(string | null)} hostLanguage
   */
  getExtractors(
    cellType: CellType,
    hostLanguage: string | null
  ): IForeignCodeExtractor[] {
    if (hostLanguage) {
      const currentMap = this._extractorMap.get(cellType)!;
      return currentMap.get(hostLanguage) ?? [];
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
        const currentMap = this._extractorMap.get(type)!;
        const extractorList = currentMap.get(hostLanguage);
        if (!extractorList) {
          currentMap.set(hostLanguage, [extractor]);
        } else {
          extractorList?.push(extractor);
        }
      });
    } else {
      cellType.forEach(type => {
        this._extractorMapAnyLanguage.get(type)!.push(extractor);
      });
    }
  }

  /**
   * The map with key is the type of cell, value is another map between
   * the language of cell and its code extractor.
   */
  private _extractorMap: Map<CellType, Map<string, IForeignCodeExtractor[]>>;

  /**
   * The map with key is the cell type, value is the code extractor associated
   * with this cell type, this is used for the non-code cell types.
   */
  private _extractorMapAnyLanguage: Map<CellType, IForeignCodeExtractor[]>;
}
