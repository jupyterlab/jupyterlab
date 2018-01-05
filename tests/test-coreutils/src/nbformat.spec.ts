// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect
} from 'chai';

import {
  nbformat
} from '@jupyterlab/coreutils';


const VALIDATE = nbformat.validateMimeValue;


describe('@jupyterlab/coreutils', () => {

  describe('nbformat', () => {

    describe('validateMimeValue', () => {

      it('should return true for a valid json object', () => {
        expect(VALIDATE('application/json', { 'foo': 1 })).to.equal(true);
      });

      it('should return true for a valid json-like object', () => {
        expect(VALIDATE('application/foo+json', { 'foo': 1 })).to.equal(true);
      });

      it('should return true for a valid string object', () => {
        expect(VALIDATE('text/plain', 'foo')).to.equal(true);
      });

      it('should return true for a valid array of strings object', () => {
        expect(VALIDATE('text/plain', ['foo', 'bar'])).to.equal(true);
      });

      it('should return false for a json type with string data', () => {
        expect(VALIDATE('application/foo+json', 'bar')).to.equal(false);
      });

      it('should return false for a string type with json data', () => {
        expect(VALIDATE('foo/bar', { 'foo': 1 })).to.equal(false);
      });

    });

  });

});
