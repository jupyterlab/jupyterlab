# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

FROM mambaorg/micromamba:latest

# Create new user
ARG NEW_MAMBA_USER_ID=57440
ARG NEW_MAMBA_USER_GID=57440
ARG NEW_MAMBA_USER=labdev

USER root

RUN if grep -q '^ID=alpine$' /etc/os-release; then \
      # alpine does not have usermod/groupmod
      apk add --no-cache --virtual temp-packages shadow=4.13-r0; \
    fi && \
    usermod "--login=${NEW_MAMBA_USER}" "--home=/home/${NEW_MAMBA_USER}" \
        --move-home "-u ${NEW_MAMBA_USER_ID}" "${MAMBA_USER}" && \
    groupmod "--new-name=${NEW_MAMBA_USER}" \
        "-g ${NEW_MAMBA_USER_GID}" "${MAMBA_USER}" && \
    if grep -q '^ID=alpine$' /etc/os-release; then \
      # remove the packages that were only needed for usermod/groupmod
      apk del temp-packages; \
    fi && \
    # Update the expected value of MAMBA_USER for the
    # _entrypoint.sh consistency check.
    echo "${NEW_MAMBA_USER}" > "/etc/arg_mamba_user" && \
    :
ENV MAMBA_USER=$NEW_MAMBA_USER
USER $MAMBA_USER

WORKDIR /home/$MAMBA_USER/jupyterlab_cache

COPY --chown=$MAMBA_USER:$MAMBA_USER ../binder/environment.yml ./binder/environment.yml

RUN  micromamba install -n base -c conda-forge git rsync -y && micromamba install -y -n base -f ./binder/environment.yml && micromamba clean --all --yes

COPY --chown=$MAMBA_USER:$MAMBA_USER .. .

RUN micromamba run jlpm install

WORKDIR /home/$MAMBA_USER/jupyterlab

RUN micromamba run rsync -ar /home/$MAMBA_USER/jupyterlab_cache/. /home/$MAMBA_USER/jupyterlab && micromamba run python -m pip install -e  ".[dev,docs,test]"

EXPOSE 8888

WORKDIR  /home/$MAMBA_USER/jupyterlab
