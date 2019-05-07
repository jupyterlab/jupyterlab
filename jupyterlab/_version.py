# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from collections import namedtuple

VersionInfo = namedtuple('VersionInfo', [
    'major',
    'minor',
    'micro',
    'releaselevel',
    'serial'
])

# DO NOT EDIT THIS DIRECTLY!  It is managed by bumpversion
__version__ = '1.0.0a3'

parts = __version__.split('.')
if len(parts) < 4:
    parts.append('final')
if len(parts) < 5:
    parts.append(0)

version_info = VersionInfo(*parts)
