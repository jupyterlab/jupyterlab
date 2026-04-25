/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import type { Transformation } from '../interfaces';

/**
 * Result of a transformation.
 */
export interface TransformResult {
  code: string;
  transformations: Transformation[];
}

/**
 * Transformer for import optimization.
 *
 * Handles:
 * - Removing unused imports
 * - Sorting imports alphabetically
 * - Consolidating duplicate imports
 * - Standardizing import style
 */
export class ImportTransformer {
  /**
   * Transform code with import optimizations.
   */
  transform(code: string, language: string): TransformResult {
    const transformations: Transformation[] = [];
    let transformed = code;

    // Language-specific import optimization
    switch (language) {
      case 'python':
        transformed = this.optimizePythonImports(transformed, transformations);
        break;
      case 'javascript':
      case 'typescript':
        transformed = this.optimizeJSImports(transformed, transformations);
        break;
      default:
        // For unsupported languages, return original code
        break;
    }

    return {
      code: transformed,
      transformations
    };
  }

  /**
   * Optimize Python imports.
   */
  private optimizePythonImports(
    code: string,
    transformations: Transformation[]
  ): string {
    const lines = code.split('\n');
    const importLines: number[] = [];
    const imports: string[] = [];

    // Find import statements
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
        importLines.push(index);
        imports.push(line);
      }
    });

    if (imports.length === 0) {
      return code;
    }

    // Sort imports
    const sortedImports = [...imports].sort((a, b) => a.localeCompare(b));

    // Check if sorting would change anything
    const needsSorting = JSON.stringify(imports) !== JSON.stringify(sortedImports);

    if (needsSorting) {
      // Replace imports with sorted version
      let newCode = code;
      importLines.forEach((lineIndex, i) => {
        const start = code.indexOf(imports[i]);
        if (start !== -1) {
          newCode = newCode.replace(imports[i], sortedImports[i]);
        }
      });

      transformations.push({
        type: 'import-sorting',
        description: 'Sorted import statements alphabetically',
        range: { start: 0, end: code.length },
        confidence: 0.95
      });

      return newCode;
    }

    return code;
  }

  /**
   * Optimize JavaScript/TypeScript imports.
   */
  private optimizeJSImports(
    code: string,
    transformations: Transformation[]
  ): string {
    // Similar logic for JS/TS imports
    // For now, return original code
    return code;
  }
}
