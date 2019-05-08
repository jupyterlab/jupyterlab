# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import re
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


# Extract the version info from the version.
patt = r'(?P<major>\d+)\.(?P<minor>\d+)\.(?P<patch>\d+)((?P<release>\S+)(?P<build>\d+))?'
match = re.match(patt, __version__)

major = int(match.group('major'))
minor = int(match.group('minor'))
patch = int(match.group('patch'))
release = match.group('release') or 'final'
build = int(match.group('build') or 0)

if release == 'a':
    release = 'alpha'
elif release == 'rc':
    release = 'candidate'

# Create the version info
version_info = VersionInfo(major, minor, patch, release, build)
