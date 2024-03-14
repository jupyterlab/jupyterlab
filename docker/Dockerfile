# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

# Image must be ubuntu or debian based
ARG BASE_TAG=1.5.5-jammy

FROM --platform=linux/amd64 mambaorg/micromamba:${BASE_TAG} as base

ARG NODE_VERSION=20.1
ARG PYTHON_VERSION=3
ARG YARN_VERSION=3
# Create new user
ARG NEW_MAMBA_USER_ID=57440
ARG NEW_MAMBA_USER_GID=57440

USER root

RUN if [ "$(id ${MAMBA_USER} -u)" != "$NEW_MAMBA_USER_ID" ]; then \
    usermod "-u ${NEW_MAMBA_USER_ID}" "${MAMBA_USER}"; \
  fi
RUN if [ "$(id ${MAMBA_USER} -g)" != "$NEW_MAMBA_USER_GID" ]; then \
    groupmod -o -g ${NEW_MAMBA_USER_GID} ${MAMBA_USER} \
    && usermod -g ${NEW_MAMBA_USER_GID} ${MAMBA_USER}; \
  fi

USER $MAMBA_USER

# Add the pip user installation path
ENV PATH="/home/${MAMBA_USER}/.local/bin:${PATH}"

# Install base dev tools with conda
RUN --mount=type=cache,target=/jupyterlab/conda-cache,uid=${NEW_MAMBA_USER_ID},gid=${NEW_MAMBA_USER_GID} \
    CONDA_PKGS_DIRS="/jupyterlab/conda-cache" micromamba install -c nodefaults -c conda-forge -yn base \
      nodejs=${NODE_VERSION} yarn=${YARN_VERSION} git python=${PYTHON_VERSION}

# Install dependencies for Playwright
RUN mkdir /ms-playwright && cd /ms-playwright \
    && micromamba run npm init -y \
    && micromamba run npm install playwright \
    && micromamba run npx playwright install-deps \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && cd / && rm -rf /ms-playwright \
    && micromamba run npm cache clean --force

WORKDIR /home/$MAMBA_USER/jupyterlab_cache

# Copy minimum files to fake the Python package
COPY --chown=$MAMBA_USER:$MAMBA_USER pyproject.toml LICENSE README.md ./
COPY --chown=$MAMBA_USER:$MAMBA_USER jupyterlab/_version.py ./jupyterlab/_version.py

# Install all python dependencies only with pip to maximize using its cache
RUN --mount=type=cache,target=/jupyterlab/pip-cache,uid=${NEW_MAMBA_USER_ID},gid=${NEW_MAMBA_USER_GID} \
    PIP_CACHE_DIR="/jupyterlab/pip-cache" SKIP_JUPYTER_BUILDER=1 micromamba run python -m pip install -e  ".[dev,docs,test]" \
    && cd / \
    && rm -rf /home/$MAMBA_USER/jupyterlab_cache

EXPOSE 8888

FROM base as dev

COPY --chown=$MAMBA_USER:$MAMBA_USER . .

# Build the cache in /home/$MAMBA_USER/jupyterlab_cache
RUN micromamba run yarn install

WORKDIR /home/$MAMBA_USER/jupyterlab

RUN micromamba install -n base -c conda-forge rsync -y \
    && micromamba run rsync -ar /home/$MAMBA_USER/jupyterlab_cache/. /home/$MAMBA_USER/jupyterlab \
    && micromamba run python -m pip install -e  "."

FROM base as build

WORKDIR /home/$MAMBA_USER/jupyterlab

COPY --chown=$MAMBA_USER:$MAMBA_USER . .

ENV YARN_CACHE_FOLDER=/home/$MAMBA_USER/.yarn/cache YARN_ENABLE_INLINE_BUILDS=1

# Build should work without yarn
RUN --mount=type=cache,target=/jupyterlab/yarn-cache,uid=${NEW_MAMBA_USER_ID},gid=${NEW_MAMBA_USER_GID} \
    micromamba remove -yn base yarn \
    && YARN_CACHE_FOLDER=/jupyterlab/yarn-cache micromamba run python -m pip install -e  "."

RUN micromamba run python -c "from jupyterlab.commands import build_check; build_check()"
