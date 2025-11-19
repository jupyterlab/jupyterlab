// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  getBaseNameFromMimeType,
  getExtensionFromMimeType
} from '@jupyterlab/coreutils';

describe('@jupyterlab/coreutils', () => {
  describe('getExtensionFromMimeType()', () => {
    it('should return common extensions', () => {
      expect(getExtensionFromMimeType('image/png')).toBe('png');
      expect(getExtensionFromMimeType('image/jpeg')).toBe('jpg');
      expect(getExtensionFromMimeType('image/gif')).toBe('gif');
      expect(getExtensionFromMimeType('image/webp')).toBe('webp');

      expect(getExtensionFromMimeType('audio/mp3')).toBe('mp3');
      expect(getExtensionFromMimeType('audio/wav')).toBe('wav');

      expect(getExtensionFromMimeType('video/mp4')).toBe('mp4');
      expect(getExtensionFromMimeType('video/webm')).toBe('webm');
    });

    it('should return bin for unknown MIME types', () => {
      expect(getExtensionFromMimeType('application/x-unknown-type')).toBe(
        'bin'
      );
      expect(getExtensionFromMimeType('')).toBe('bin');
      expect(getExtensionFromMimeType('not-a-mime-type')).toBe('bin');
    });
  });

  describe('getBaseNameFromMimeType()', () => {
    it('should return basic type for image, video, and audio', () => {
      expect(getBaseNameFromMimeType('image/png')).toBe('image');
      expect(getBaseNameFromMimeType('image/jpeg')).toBe('image');
      expect(getBaseNameFromMimeType('image/x-unknown')).toBe('image');

      expect(getBaseNameFromMimeType('audio/wav')).toBe('audio');
      expect(getBaseNameFromMimeType('audio/x-unknown')).toBe('audio');

      expect(getBaseNameFromMimeType('video/mp4')).toBe('video');
      expect(getBaseNameFromMimeType('video/x-unknown')).toBe('video');
    });

    it('should return file for other mime type categories', () => {
      expect(getBaseNameFromMimeType('application/json')).toBe('file');
      expect(getBaseNameFromMimeType('text/plain')).toBe('file');
      expect(getBaseNameFromMimeType('application/octet-stream')).toBe('file');
      expect(getBaseNameFromMimeType('')).toBe('file');
      expect(getBaseNameFromMimeType('not-a-mime-type')).toBe('file');
    });
  });
});
