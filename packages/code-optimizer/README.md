# @jupyterlab/code-optimizer

Core optimization logic for JupyterLab code cells.

This package provides rule-based static analysis and code transformation capabilities to improve code quality, reduce complexity, and enhance reusability.

## Features

- Import optimization (remove unused, sort, consolidate)
- Code simplification (constant folding, dead code removal)
- Complexity reduction (extract expressions, flatten structures)
- Reusability improvements (extract common patterns)

## Usage

```typescript
import { RuleBasedOptimizer } from '@jupyterlab/code-optimizer';

const optimizer = new RuleBasedOptimizer();
const result = optimizer.optimize(code, 'python');

console.log(result.code); // Optimized code
console.log(result.transformations); // List of transformations applied
console.log(result.metrics); // Optimization metrics
```
