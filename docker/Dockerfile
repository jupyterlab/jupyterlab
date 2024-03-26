# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

FROM --platform=linux/amd64 mambaorg/micromamba:1.5.5-jammy as base

# Create new user
ARG NEW_MAMBA_USER_ID=57440
ARG NEW_MAMBA_USER_GID=57440

USER root

RUN if grep -q '^ID=alpine$' /etc/os-release; then \
  # alpine does not have usermod/groupmod
  apk add --no-cache --virtual temp-packages shadow=4.13-r0; \
  fi
RUN if [ "$(id ${MAMBA_USER} -u)" != "$NEW_MAMBA_USER_ID" ]; then \
  usermod "-u ${NEW_MAMBA_USER_ID}" "${MAMBA_USER}"; \
  fi
RUN if [ "$(id ${MAMBA_USER} -g)" != "$NEW_MAMBA_USER_GID" ]; then \
  groupmod -o -g ${NEW_MAMBA_USER_GID} ${MAMBA_USER} && \
  usermod -g ${NEW_MAMBA_USER_GID} ${MAMBA_USER}; \
  fi
RUN if grep -q '^ID=alpine$' /etc/os-release; then \
  # remove the packages that were only needed for usermod/groupmod
  apk del temp-packages; \
  fi

USER $MAMBA_USER

# Add the pip user installation path
ENV PATH="/home/${MAMBA_USER}/.local/bin:${PATH}"

# Install base dev tools with conda
RUN --mount=type=cache,target=/jupyterlab/conda-cache,uid=${NEW_MAMBA_USER_ID},gid=${NEW_MAMBA_USER_GID} \
    CONDA_PKGS_DIRS="/jupyterlab/conda-cache" micromamba install -c nodefaults -c conda-forge -yn base nodejs=20.1 yarn=3 git python=3

WORKDIR /home/$MAMBA_USER/jupyterlab_cache

COPY --chown=$MAMBA_USER:$MAMBA_USER pyproject.toml LICENSE README.md ./
COPY --chown=$MAMBA_USER:$MAMBA_USER jupyterlab/_version.py ./jupyterlab/_version.py

# Install all python dependencies only with pip to maximize using its cache
RUN --mount=type=cache,target=/jupyterlab/pip-cache,uid=${NEW_MAMBA_USER_ID},gid=${NEW_MAMBA_USER_GID} \
    PIP_CACHE_DIR="/jupyterlab/pip-cache" SKIP_JUPYTER_BUILDER=1 micromamba run python -m pip install -e  ".[dev,docs,test]" && \
    cd / && \
    rm -rf /home/$MAMBA_USER/jupyterlab_cache

EXPOSE 8888

FROM base as dev

COPY --chown=$MAMBA_USER:$MAMBA_USER . .

# Build the cache in /home/$MAMBA_USER/jupyterlab_cache
RUN micromamba run yarn install

WORKDIR /home/$MAMBA_USER/jupyterlab

RUN micromamba install -n base -c conda-forge rsync -y && \
    micromamba run rsync -ar /home/$MAMBA_USER/jupyterlab_cache/. /home/$MAMBA_USER/jupyterlab && \
    micromamba run python -m pip install -e  "."
