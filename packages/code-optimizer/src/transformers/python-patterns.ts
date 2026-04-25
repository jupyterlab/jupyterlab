/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
----------------------------------------------------------------------------*/

import type { TransformResult } from './imports';
import type { Transformation } from '../interfaces';

/**
 * Transformer for Python-specific pattern optimizations.
 *
 * Handles:
 * - Converting while loops to for loops where appropriate
 * - Suggesting list comprehensions
 * - Using built-in functions (sum, map, filter)
 * - Simplifying manual index incrementation
 */
export class PythonPatternTransformer {
  /**
   * Transform code with Python pattern optimizations.
   */
  transform(code: string, language: string): TransformResult {
    const transformations: Transformation[] = [];
    let transformed = code;

    if (language !== 'python') {
      return { code: transformed, transformations };
    }

    // Convert while loops with index to for loops
    transformed = this.convertWhileToFor(transformed, transformations);

    // Suggest list comprehensions
    transformed = this.suggestListComprehensions(transformed, transformations);

    // Use built-in sum function
    transformed = this.useBuiltInSum(transformed, transformations);

    return {
      code: transformed,
      transformations
    };
  }

  /**
   * Convert while loops with index to for loops.
   * Pattern: while i < len(list): ... i = i + 1 → for i in range(len(list)): ...
   */
  private convertWhileToFor(
    code: string,
    transformations: Transformation[]
  ): string {
    let transformed = code;
    
    // Pattern 1: while i < len(x): ... i = i + 1 (with flexible whitespace and blank lines)
    // This pattern is more flexible to handle the actual code structure
    const pattern1 = /while\s+(\w+)\s*<\s*len\((\w+)\)\s*:\s*\n([\s\S]*?)\n\s*\1\s*=\s*\1\s*\+\s*1/g;
    
    transformed = transformed.replace(pattern1, (match, indexVar, listVar, body, offset) => {
      transformations.push({
        type: 'loop-conversion',
        description: `Converted while loop with index to for loop`,
        range: { start: offset, end: offset + match.length },
        confidence: 0.8
      });
      
      // Remove the increment line from the body
      const incrementPattern = new RegExp(`\\n\\s*${indexVar}\\s*=\\s*${indexVar}\\s*\\+\\s*1\\s*$`);
      const bodyWithoutIncrement = body.replace(incrementPattern, '');
      const indentedBody = this.indentBody(bodyWithoutIncrement);
      return `for ${indexVar} in range(len(${listVar})):\n${indentedBody}`;
    });

    return transformed;
  }

  /**
   * Suggest list comprehensions for append loops.
   * Pattern: result = []; for x in list: result.append(x) → result = [x for x in list]
   */
  private suggestListComprehensions(
    code: string,
    transformations: Transformation[]
  ): string {
    // This is a simplified pattern - a full implementation would use AST analysis
    // For now, we'll skip this as it's complex to implement safely without AST
    return code;
  }

  /**
   * Use built-in sum function instead of manual accumulation.
   * Pattern: total = 0; for x in list: total = total + x → total = sum(list)
   */
  private useBuiltInSum(
    code: string,
    transformations: Transformation[]
  ): string {
    let transformed = code;

    // Pattern: total = 0; for x in list: total = total + x
    const pattern = /(\w+)\s*=\s*0\s*\nfor\s+(\w+)\s+in\s+(\w+):\s*\n\s*(\1)\s*=\s*\1\s*\+\s*\2/g;
    
    transformed = transformed.replace(pattern, (match, totalVar, itemVar, listVar, body, offset) => {
      transformations.push({
        type: 'builtin-function',
        description: `Replaced manual sum loop with built-in sum() function`,
        range: { start: offset, end: offset + match.length },
        confidence: 0.9
      });
      
      return `${totalVar} = sum(${listVar})`;
    });

    return transformed;
  }

  /**
   * Ensure body is properly indented (preserves relative indentation).
   */
  private indentBody(body: string): string {
    // Preserve the original indentation of the body
    // The body already has the correct indentation from the original code
    return body;
  }
}
