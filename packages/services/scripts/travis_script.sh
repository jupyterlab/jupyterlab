#!/bin/bash
set -ex
export DISPLAY=:99.0
sh -e /etc/init.d/xvfb start || true

yarn clean
yarn build
yarn build:examples
npm test
yarn test:coverage
export PATH="$HOME/miniconda/bin:$PATH"
yarn test:integration

pushd examples/node
python main.py 
popd

if [[ $TRAVIS_NODE_VERSION == "5.1" ]]; then    
    yarn docs
fi
