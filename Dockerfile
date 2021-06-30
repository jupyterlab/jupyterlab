# Build image
FROM mambaorg/micromamba:0.14.0 as build

# Install basic tools
RUN micromamba install -qy -c conda-forge python nodejs yarn=1.21 build

# Install python dependencies - faster build thanks to caching
COPY setup.cfg /tmp

RUN list_package=$(python -c "from configparser import ConfigParser; c = ConfigParser(); c.read('/tmp/setup.cfg'); print(' '.join(c['options']['install_requires'].strip().splitlines()))") \
    && micromamba install -qy -c conda-forge $list_package

# Build JupyterLab wheel
COPY ./builder /tmp/jupyterlab-dev/builder
COPY ./buildutils /tmp/jupyterlab-dev/buildutils
COPY ./dev_mode /tmp/jupyterlab-dev/dev_mode
COPY ./jupyterlab /tmp/jupyterlab-dev/jupyterlab
COPY ./packages /tmp/jupyterlab-dev/packages
COPY ./scripts /tmp/jupyterlab-dev/scripts
COPY ./*.* ./LICENSE /tmp/jupyterlab-dev/

RUN pushd /tmp/jupyterlab-dev \
    && pip install -e . \
    && jlpm install \
    && jlpm run build \
    && python -m build .

# Runtime image
FROM mambaorg/micromamba:0.14.0

RUN micromamba install -qy -c conda-forge python \
    && useradd --shell /bin/bash jovyan \
    && chown jovyan $HOME

# Install python dependencies - faster build thanks to caching
COPY setup.cfg /tmp

RUN list_package=$(python -c "from configparser import ConfigParser; c = ConfigParser(); c.read('/tmp/setup.cfg'); print(' '.join(c['options']['install_requires'].strip().splitlines()))") \
    && micromamba install -qy -c conda-forge $list_package \
    && micromamba clean --all --yes \
    && rm /tmp/setup.cfg

USER jovyan
WORKDIR ${HOME}

# Install JupyterLab
ENV PATH="/home/micromamba/.local/bin:$PATH"

COPY --from=build /tmp/jupyterlab-dev/dist/jupyterlab*.whl /tmp

RUN pip install /tmp/jupyterlab*.whl \
    # TODO remove when ipykernel 6 is released
    && pip install --pre --upgrade ipykernel \
    && mkdir -p /home/micromamba/jlab_root

COPY ./docker/jupyter_server_config.json /etc/jupyter/

EXPOSE 8888

ENTRYPOINT ["jupyter", "lab"]
