#! /bin/sh
# This script build the JupyterLab image
if [ -d ${PWD}/packages ]; then
    echo Create package.json files archive
    tar cf /tmp/package_json.tar.gz package.json packages/*/package.json
    cp /tmp/package_json.tar.gz ${PWD}
    echo Build JupyterLab docker
    docker build -f Dockerfile -t jupyterlab-dev ${PWD}
else
    echo You need to run this script from the JupyterLab root folder
fi