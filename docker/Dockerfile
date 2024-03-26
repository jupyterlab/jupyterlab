# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

# Image must be ubuntu or debian based
ARG BASE_TAG=1.5.5-jammy

ARG PREPARE_SHARE_PATH=/tmp/share

FROM bash:5-alpine3.19 as prepare

ARG PREPARE_SHARE_PATH

RUN --mount=type=bind,target=/tmp/jupyterlab \
    mkdir -p ${PREPARE_SHARE_PATH} \
    && /usr/local/bin/bash -c "shopt -s globstar; tar -cvf ${PREPARE_SHARE_PATH}/packages.tar /tmp/jupyterlab/**/package.json /tmp/jupyterlab/yarn.lock"

FROM --platform=linux/amd64 mambaorg/micromamba:${BASE_TAG} as base

ARG PREPARE_SHARE_PATH

ARG NODE_VERSION=20.1
ARG PYTHON_VERSION=3
ARG YARN_VERSION=3.5
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

USER root

# Install dependencies for Playwright - must be root to install packages with apt
RUN --mount=type=cache,target=/var/cache/apt \
    export WORKDIR=/ms-playwright && mkdir -p ${WORKDIR} && cd ${WORKDIR} \
    && micromamba run npx playwright install-deps \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && cd / && rm -rf ${WORKDIR} \
    && micromamba run npm cache clean --force

USER $MAMBA_USER

WORKDIR /home/$MAMBA_USER/jupyterlab_cache

# Copy minimum files to fake the Python package
COPY --chown=$MAMBA_USER:$MAMBA_USER pyproject.toml LICENSE README.md ./
COPY --chown=$MAMBA_USER:$MAMBA_USER jupyterlab/_version.py ./jupyterlab/_version.py

# Install all python dependencies only with pip to maximize using its cache
RUN --mount=type=cache,target=/jupyterlab/pip-cache,uid=${NEW_MAMBA_USER_ID},gid=${NEW_MAMBA_USER_GID} \
    PIP_CACHE_DIR="/jupyterlab/pip-cache" SKIP_JUPYTER_BUILDER=1 micromamba run python -m pip install -e  ".[dev,docs,test]" \
    && cd / && rm -rf /home/$MAMBA_USER/jupyterlab_cache

ENV YARN_CACHE_FOLDER=/home/$MAMBA_USER/.caches/yarn YARN_ENABLE_GLOBAL_CACHE=false YARN_ENABLE_MIRROR=false

# Initialize the yarn cache
RUN --mount=type=bind,from=prepare,source=${PREPARE_SHARE_PATH},target=${PREPARE_SHARE_PATH} \
    export WORKDIR=/tmp/packages \
    && mkdir -p ${WORKDIR} \
    && tar -xvf ${PREPARE_SHARE_PATH}/packages.tar -C ${WORKDIR} --strip-components=2 \
    && cd ${WORKDIR} \
    && micromamba run yarn install --mode skip-build \
    && cd / && rm -rf ${WORKDIR} && export WORKDIR=

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

RUN micromamba run git config --global user.name foo \
    && micromamba run git config --global user.email foo@bar.com

WORKDIR /home/$MAMBA_USER/jupyterlab

COPY --chown=$MAMBA_USER:$MAMBA_USER . .

ENV YARN_ENABLE_INLINE_BUILDS=1

# Build should work without yarn
RUN micromamba remove -yn base yarn \
    && micromamba run python -m pip install -e  "."

RUN micromamba run python -c "from jupyterlab.commands import build_check; build_check()"
