# Runtime dependencies and security considerations

This document explains which packages are included in the JupyterLab runtime
bundle, and how to interpret dependency-related security alerts.

## Overview

JupyterLab has multiple categories of dependencies:
- Runtime dependencies shipped to users
- Development and test-only dependencies
- Tooling dependencies used during build time

Security scanners may flag vulnerabilities in dependencies that are not part
of the runtime bundle. This document clarifies how to distinguish these cases.
