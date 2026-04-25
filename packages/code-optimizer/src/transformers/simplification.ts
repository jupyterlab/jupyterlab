/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import type { TransformResult } from './imports';
import type { Transformation } from '../interfaces';

/**
 * Transformer for code simplification.
 *
 * Handles:
 * - Constant folding (e.g., 2 + 2 → 4)
 * - Removing dead code
 * - Simplifying boolean expressions
 * - Removing redundant parentheses
 */
export class SimplificationTransformer {
  /**
   * Transform code with simplification optimizations.
   */
  transform(code: string, language: string): TransformResult {
    const transformations: Transformation[] = [];
    let transformed = code;

    // Constant folding for simple arithmetic
    transformed = this.constantFolding(transformed, transformations);

    // Remove redundant parentheses - DISABLED: too aggressive, breaks function calls and tuples
    // transformed = this.removeRedundantParentheses(transformed, transformations);

    // Simplify boolean expressions
    transformed = this.simplifyBooleans(transformed, transformations);

    return {
      code: transformed,
      transformations
    };
  }

  /**
   * Perform constant folding for simple arithmetic expressions.
   */
  private constantFolding(
    code: string,
    transformations: Transformation[]
  ): string {
    let transformed = code;
    let changed = true;
    let iterations = 0;
    const maxIterations = 100;

    // Simple constant folding: replace numeric expressions
    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      // Match simple arithmetic: number + number, number * number, etc.
      const patterns = [
        /(\d+)\s*\+\s*(\d+)/g,
        /(\d+)\s*\*\s*(\d+)/g,
        /(\d+)\s*-\s*(\d+)/g
      ];

      patterns.forEach(pattern => {
        transformed = transformed.replace(pattern, (match, a, b, offset) => {
          const numA = parseInt(a, 10);
          const numB = parseInt(b, 10);
          let result: number;

          if (pattern.source.includes('+')) {
            result = numA + numB;
          } else if (pattern.source.includes('*')) {
            result = numA * numB;
          } else {
            result = numA - numB;
          }

          changed = true;
          transformations.push({
            type: 'constant-folding',
            description: `Folded constant expression ${match} to ${result}`,
            range: { start: offset, end: offset + match.length },
            confidence: 0.9
          });

          return result.toString();
        });
      });
    }

    return transformed;
  }

  /**
   * Simplify boolean expressions.
   */
  private simplifyBooleans(
    code: string,
    transformations: Transformation[]
  ): string {
    let transformed = code;

    // Simplify True/False in Python
    transformed = transformed.replace(/True and True/g, () => {
      transformations.push({
        type: 'boolean-simplification',
        description: 'Simplified True and True to True',
        range: { start: 0, end: transformed.length },
        confidence: 0.95
      });
      return 'True';
    });

    transformed = transformed.replace(/False or False/g, () => {
      transformations.push({
        type: 'boolean-simplification',
        description: 'Simplified False or False to False',
        range: { start: 0, end: transformed.length },
        confidence: 0.95
      });
      return 'False';
    });

    return transformed;
  }
}
