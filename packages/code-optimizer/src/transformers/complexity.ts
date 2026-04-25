/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import type { TransformResult } from './imports';
import type { Transformation } from '../interfaces';

/**
 * Transformer for complexity reduction.
 *
 * Handles:
 * - Extracting repeated expressions into variables
 * - Flattening nested structures where appropriate
 * - Removing unnecessary temporary variables
 */
export class ComplexityTransformer {
  /**
   * Transform code with complexity reduction optimizations.
   */
  transform(code: string, language: string): TransformResult {
    const transformations: Transformation[] = [];
    let transformed = code;

    // Extract repeated expressions (basic implementation)
    transformed = this.extractRepeatedExpressions(
      transformed,
      transformations
    );

    return {
      code: transformed,
      transformations
    };
  }

  /**
   * Extract repeated expressions into variables.
   *
   * This is a basic implementation that looks for repeated numeric literals.
   * A full implementation would use AST analysis.
   */
  private extractRepeatedExpressions(
    code: string,
    transformations: Transformation[]
  ): string {
    // Find repeated numeric literals (simple heuristic)
    const literalPattern = /(\d+\.\d+|\d+)/g;
    const literals: Map<string, number> = new Map();
    let match;

    while ((match = literalPattern.exec(code)) !== null) {
      const literal = match[1];
      if (!literals.has(literal)) {
        literals.set(literal, 0);
      }
      literals.set(literal, literals.get(literal)! + 1);
    }

    // Extract literals that appear 5+ times (excluding 0 and 1 which are too common)
    let transformed = code;

    literals.forEach((count, literal) => {
      // Skip 0 and 1 - they're too common and not worth extracting
      if (literal === '0' || literal === '1') {
        return;
      }

      // Only extract if it appears 5+ times (more conservative)
      if (count >= 5) {
        // Create a variable name
        const varName = `CONST_${literal.replace('.', '_')}`;

        // Insert variable declaration at the beginning of the code
        const declaration = `${varName} = ${literal}\n`;
        transformed = declaration + transformed;

        // Replace all occurrences using string replacement (more robust than position-based)
        // Use word boundaries to avoid replacing digits in other contexts
        const escapedLiteral = literal.replace('.', '\\.');
        const regex = new RegExp(`\\b${escapedLiteral}\\b`, 'g');
        
        // Replace in the code part only, not in the declaration we just added
        const codePart = transformed.substring(declaration.length);
        const replacedCode = codePart.replace(regex, varName);
        transformed = declaration + replacedCode;

        transformations.push({
          type: 'expression-extraction',
          description: `Extracted repeated literal ${literal} into variable ${varName}`,
          range: { start: 0, end: code.length },
          confidence: 0.7
        });
      }
    });

    return transformed;
  }
}
