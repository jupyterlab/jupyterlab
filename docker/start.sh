#!/bin/bash

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
set -ex
set -o pipefail

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
ROOT_DIR=$(dirname $SCRIPT_DIR)

DEV_USER="mambauser"
GID=$(id -g)
USER_ID=$(id -u)
RSYNC_CMD="rsync -ar /home/$DEV_USER/jupyterlab_cache/node_modules/. /home/$DEV_USER/jupyterlab/node_modules"
CMD=$1 # possible command: build, clean, dev, shell

PORT=8888 # Optional, only used for the `dev` command
re='^[0-9]+$'
if [[ $2 =~ $re ]] ; then
    PORT=$2
fi

stringmd5() {
    echo "md5sum,md5" | tr ',' '\n' | while read -r cmd; do
        if [[ -x "$(command -v "${cmd}")" ]]; then
            num=$(( 0x$(echo "$1" | command "${cmd}" | cut -d ' ' -f 1 | head -c 15) ))
            [[ $num -lt 0 ]] && num=$((num * -1))
            echo $num
        fi
    done
}

ROOT_DIR_MD5=$(stringmd5 $ROOT_DIR)
IMAGE_TAG="jupyterlab_dev:$ROOT_DIR_MD5"
DEV_CONTAINER="jupyterlab_dev_container_$ROOT_DIR_MD5"

build_image () {
    docker build  --build-arg NEW_MAMBA_USER_ID=$USER_ID --build-arg NEW_MAMBA_USER_GID=$GID $ROOT_DIR -f $SCRIPT_DIR/Dockerfile -t $IMAGE_TAG
}

stop_contaniner () {
    docker stop $DEV_CONTAINER &>/dev/null || true
}

if [[ $CMD == 'build' ]]; then
    echo "Building docker image"
    build_image

    elif [[ $CMD == 'clean' ]]; then
    # Stop the dev container if it's running
    stop_contaniner
    docker rmi $IMAGE_TAG --force

    elif [[ $CMD == 'stop' ]]; then
    stop_contaniner

    elif [[ $CMD == 'dev' || $CMD == 'dev-detach' || $CMD == 'shell' || $CMD == '' ]]; then
    if test -z "$(docker images -q $IMAGE_TAG)"; then
        echo "Image does not exist, start building!"
        build_image
    fi
    stop_contaniner
    if [[ $CMD == 'dev' || $CMD == '' || $CMD == 'dev-detach' ]]; then
        DOCKER_CMD="$RSYNC_CMD && jupyter lab --dev-mode --extensions-in-dev-mode --watch --ip 0.0.0.0 --port $PORT"
    else
        DOCKER_CMD="$RSYNC_CMD && bash"
    fi
    RUN_MODE="-it"
    if [[ $CMD == 'dev-detach' ]]; then
        RUN_MODE="-d"
    fi
    docker run $RUN_MODE --user $USER_ID:$GID --name $DEV_CONTAINER --rm -p $PORT:$PORT -v $ROOT_DIR:/home/$DEV_USER/jupyterlab --entrypoint "/bin/bash" $IMAGE_TAG -i -c "$DOCKER_CMD"
fi
