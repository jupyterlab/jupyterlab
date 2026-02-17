# @jupyterlab/core-meta

Minimal metadata package for JupyterLab core.

This package contains the `staging/package.json` from a specific
JupyterLab release and is intended for use by the JupyterLab builder
and related tooling.

## Purpose

- Avoid runtime dependency on an installed JupyterLab Python package

Each version of `@jupyterlab/core-meta` corresponds exactly to the
same version of JupyterLab.

## Contents

* `core.package.json` — copied from
  `jupyterlab/staging/package.json` of the matching JupyterLab release.
