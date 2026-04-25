# @jupyterlab/code-optimizer-extension

JupyterLab extension for code optimizer integration.

This extension integrates the code optimizer with JupyterLab notebooks, providing:
- Automatic code optimization before cell execution
- Manual optimization via toolbar button
- Configurable optimization settings

## Features

- Automatic optimization before cell execution (configurable)
- Manual optimization button in cell toolbar
- Settings to enable/disable specific optimizations
- Support for Python (with plans for other languages)

## Usage

Once installed, the optimizer will:
1. Automatically optimize code before execution (if enabled in settings)
2. Add an "Optimize Code" button to each code cell toolbar
3. Provide settings to configure optimization behavior

## Settings

- **Enable automatic optimization**: Optimize code before each cell execution
- **Enable import optimization**: Sort and clean imports
- **Enable simplification**: Fold constants and simplify expressions
- **Enable complexity reduction**: Extract repeated patterns
- **Enable reusability**: Extract common patterns into functions
