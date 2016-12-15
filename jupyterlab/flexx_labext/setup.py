import os
import sys
from distutils.core import setup


if 'develop' in sys.argv or any(a.startswith('bdist') for a in sys.argv):
    import setuptools


setup_args = dict(
    name                 = 'flexx_labext',
    version              = '0.1.0',
    packages             = ['flexx_labext'],
    author               = 'Almar Klein',
    author_email         = 'almar.klein@gmail.com',
    keywords             = ['jupyterlab', 'jupyterlab extension', 'flexx'],
    include_package_data = True,
    install_requires = [
        'jupyterlab>=0.3.0',
    ]
)

if __name__ == '__main__':
    setup(**setup_args)
