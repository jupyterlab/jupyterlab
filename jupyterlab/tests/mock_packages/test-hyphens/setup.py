from os import path
from setuptools import setup
from jupyter_packaging import npm_builder, wrap_installers

version = "3.0.2"
name = "test-hyphens"
module_name = "test-hyphens"
lab_ext_name = "test-hyphens"

HERE = path.abspath(path.dirname(__file__))
lab_path = path.join(HERE, module_name, "labextension")

# Representative files that should exist after a successful build
ensured_targets = [
    path.join(lab_path, "package.json"),
]

post_develop = npm_builder(
    build_cmd="install:extension", source_dir="src", build_dir=lab_path, npm="jlpm"
)

data_files_spec = [("share/jupyter/labextensions/" + lab_ext_name, lab_path, "**")]

cmdclass = wrap_installers(post_develop=post_develop, ensured_targets=ensured_targets)

setup(name=name, version=version, packages=[module_name], cmdclass=cmdclass)
