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
version_info = VersionInfo(1, 0, 0, 'a', 3)


__version__ = '{}.{}.{}{}'.format(
    version_info.major,
    version_info.minor,
    version_info.micro,
    (''
     if version_info.releaselevel == 'final'
     else version_info.releaselevel + str(version_info.serial)))
