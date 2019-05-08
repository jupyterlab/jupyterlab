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

major = int(parts[0])
minor = int(parts[1])
micro = int(parts[2])
rel = 'final'
ser = 0

# handle the release level
if len(parts) >= 4:
    if parts[3] == 'a':
        rel = 'alpha'
    elif parts[3] == 'rc':
        rel == 'candidate'

# Handle the serial
if len(parts) < 5:
   ser = int(parts[4])

# Create the version info
version_info = VersionInfo(major, minor, micro, rel, ser)
