#!/bin/bash
# Trick to get the galata test outputs writable on the host
umask 0000
# Wait for jupyterlab container to be ready
/opt/galata/wait-for-it.sh ${SERVER_URL} --strict --timeout=${TIMEOUT:-120} -- $*
