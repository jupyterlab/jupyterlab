import { CellType } from '@jupyterlab/nbformat';

import { ILSPCodeExtractorsManager } from '../tokens';
import { IForeignCodeExtractor } from './types';

export class CodeExtractorsManager implements ILSPCodeExtractorsManager {
  private _extractorMap: Map<CellType, Map<string, IForeignCodeExtractor[]>>;
  private _extractorMapAnyLanguage: Map<CellType, IForeignCodeExtractor[]>;
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
}
