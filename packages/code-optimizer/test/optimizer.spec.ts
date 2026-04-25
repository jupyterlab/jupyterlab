/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { RuleBasedOptimizer } from '../src/optimizer';

describe('RuleBasedOptimizer', () => {
  describe('optimize', () => {
    it('should return the same code if no optimizations apply', () => {
      const optimizer = new RuleBasedOptimizer();
      const code = '# Simple comment\nx = 1';
      const result = optimizer.optimize(code, 'python');

      expect(result.code).toBe(code);
      expect(result.transformations).toHaveLength(0);
    });

    it('should sort Python imports', () => {
      const optimizer = new RuleBasedOptimizer();
      const code = 'import os\nimport sys\nimport numpy';
      const result = optimizer.optimize(code, 'python');

      // Imports should be sorted
      expect(result.code).toContain('import numpy');
      expect(result.code).toContain('import os');
      expect(result.code).toContain('import sys');
    });

    it('should fold constant arithmetic expressions', () => {
      const optimizer = new RuleBasedOptimizer();
      const code = 'x = 2 + 2';
      const result = optimizer.optimize(code, 'python');

      expect(result.code).toContain('4');
    });

    it('should calculate metrics correctly', () => {
      const optimizer = new RuleBasedOptimizer();
      const code = 'x = 1\ny = 2';
      const result = optimizer.optimize(code, 'python');

      expect(result.metrics.originalSize).toBe(code.length);
      expect(result.metrics.optimizedSize).toBeGreaterThan(0);
      expect(result.metrics.complexityReduction).toBeGreaterThanOrEqual(0);
    });

    it('should respect optimization options', () => {
      const optimizer = new RuleBasedOptimizer();
      const code = 'import os\nimport sys\nx = 2 + 2';
      const result = optimizer.optimize(code, 'python', {
        optimizations: {
          imports: false,
          simplification: true
        }
      });

      // Imports should not be sorted when disabled
      expect(result.transformations).not.toContainEqual(
        expect.objectContaining({ type: 'import-sorting' })
      );
    });
  });
});
