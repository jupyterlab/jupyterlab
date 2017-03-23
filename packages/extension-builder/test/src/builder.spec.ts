// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect
} from 'chai';

import {
  buildExtension
} from '../../lib';

let fs = (require as any)('fs');


describe('builder', () => {

  it('should build the assets', () => {
    return buildExtension({
        name: 'test',
        entry: './test/build/test.js',
        outputDir: 'build'
    }).then(function() {
        let path = './build/test.bundle.js.manifest';
        let manifest = JSON.parse(fs.readFileSync(path, 'utf8'));
        expect(manifest.name).to.equal('test');
        expect(manifest.files).to.deep.equal(['test.bundle.js', 'test.css']);

        path = './build/0.bundle.js.manifest';
        manifest = JSON.parse(fs.readFileSync(path, 'utf8'));
        expect(manifest.name).to.equal(0);
        expect(manifest.files).to.deep.equal(['0.bundle.js']);
    });
  });

});
