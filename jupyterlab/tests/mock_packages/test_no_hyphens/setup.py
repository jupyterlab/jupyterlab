from os import path
from setuptools import setup
from jupyter_packaging import (
    create_cmdclass, install_npm,
    ensure_targets, combine_commands
)

version = '3.0.2'
name = 'test_no_hyphens'
module_name = 'test_no_hyphens'
lab_ext_name = 'test_no_hyphens'

HERE = path.abspath(path.dirname(__file__))
lab_path = path.join(HERE, module_name, 'labextension')

# Representative files that should exist after a successful build
jstargets = [
    path.join(lab_path, 'package.json'),
]

package_data_spec = {
    module_name: [
        'labextension/*'
    ]
}

data_files_spec = [
    ("share/jupyter/labextensions/" + lab_ext_name, lab_path, "**")
]

cmdclass = create_cmdclass('js', package_data_spec=package_data_spec, data_files_spec=data_files_spec)
cmdclass['js'] = combine_commands(
    install_npm(
        path=path.join(HERE),
        npm=["jlpm"],
        build_cmd="build:labextension"
    ),
    ensure_targets(jstargets),
)

setup(
    name=name,
    version=version,
    packages=[module_name],
    cmdclass=cmdclass
)
