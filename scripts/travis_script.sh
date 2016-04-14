#!/bin/bash
export DISPLAY=:99.0
sh -e /etc/init.d/xvfb start
set -e
npm run clean
npm run build
npm test
npm run test:coverage
npm run build:examples
#npm run docs
