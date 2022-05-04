import { CellType } from '@jupyterlab/nbformat';
import { LanguageIdentifier } from '../lsp';
import { positionAtOffset } from '../positioning';

import { IExtractedCode, IForeignCodeExtractor } from './types';

export class TextForeignCodeExtractor implements IForeignCodeExtractor {
  language: LanguageIdentifier;
  standalone: boolean;
  fileExtension: string;
  cellType: CellType[];

  constructor(options: TextForeignCodeExtractor.IOptions) {
    this.language = options.language;
    this.standalone = options.isStandalone;
    this.fileExtension = options.file_extension;
    this.cellType = options.cellType;
  }

  hasForeignCode(code: string, cellType: CellType): boolean {
    return this.cellType.includes(cellType);
  }

  extractForeignCode(code: string): IExtractedCode[] {
    let lines = code.split('\n');

    let extracts = new Array<IExtractedCode>();

    let foreignCodeFragment = code;

    let start = positionAtOffset(0, lines);
    let end = positionAtOffset(foreignCodeFragment.length, lines);

    extracts.push({
      hostCode: '',
      foreignCode: foreignCodeFragment,
      range: { start, end },
      virtualShift: null
    });

    return extracts;
  }
}

namespace TextForeignCodeExtractor {
  export interface IOptions {
    /**
     * The foreign language.
     */
    language: string;

    /**
     * Should the foreign code be appended (False) to the previously established virtual document of the same language,
     * or is it standalone snippet which requires separate connection?
     */
    isStandalone: boolean;

    file_extension: string;

    cellType: CellType[];
  }
}
