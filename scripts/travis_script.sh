#!/bin/bash
set -e
export DISPLAY=:99.0
sh -e /etc/init.d/xvfb start || true
export PATH="$HOME/miniconda/bin:$PATH"

npm run clean
npm run build
npm run build:examples

npm run test
npm run test:coverage

exit 0
npm run docs
