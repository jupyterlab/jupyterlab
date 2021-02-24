import json
import os
import os.path as osp
import shutil
import subprocess
import sys
from pathlib import Path

import pkg_resources

try:
    from cookiecutter.main import cookiecutter
except ImportError:
    raise RuntimeError("Please install cookiecutter")


DEFAULT_COOKIECUTTER_BRANCH = "3.0"


def update_extension(target, branch=DEFAULT_COOKIECUTTER_BRANCH, interactive=True):
    """Update an extension to the current JupyterLab

    target: str
        Path to the extension directory containing the extension
    branch: str [default: DEFAULT_COOKIECUTTER_BRANCH]
        Template branch to checkout
    interactive: bool [default: true]
        Whether to ask before overwriting content

    """
    # Input is a directory with a package.json or the current directory
    # Use the cookiecutter as the source
    # Pull in the relevant config
    # Pull in the Python parts if possible
    # Pull in the scripts if possible
    target = osp.abspath(target)
    package_file = osp.join(target, 'package.json')
    setup_file = osp.join(target, 'setup.py')
    if not osp.exists(package_file):
        raise RuntimeError('No package.json exists in %s' % target)

    # Infer the options from the current directory
    with open(package_file) as fid:
        data = json.load(fid)

    if osp.exists(setup_file):
        python_name = subprocess.check_output([sys.executable, 'setup.py', '--name'], cwd=target).decode('utf8').strip()
    else:
        python_name = data['name']
        if '@' in python_name:
            python_name = python_name[1:].replace('/', '_').replace('-', '_')

    output_dir = osp.join(target, '_temp_extension')
    if osp.exists(output_dir):
        shutil.rmtree(output_dir)

    # Build up the cookiecutter args and run the cookiecutter
    extra_context = dict(
        author_name = data.get('author', '<author_name>'),
        labextension_name = data['name'],
        project_short_description = data.get('description', '<description>'),
        has_server_extension = 'y' if osp.exists(osp.join(target, 'jupyter-config')) else 'n',
        has_binder = 'y' if osp.exists(osp.join(target, 'binder')) else 'n',
        repository = data.get('repository', {}).get('url', '<repository'),
        python_name = python_name
    )

    template = 'https://github.com/jupyterlab/extension-cookiecutter-ts'
    cookiecutter(template=template, checkout=branch, output_dir=output_dir,
                extra_context=extra_context, no_input=not interactive)

    python_name = os.listdir(output_dir)[0]

    # hoist the output up one level
    shutil.move(osp.join(output_dir, python_name), osp.join(output_dir, '_temp'))
    for filename in os.listdir(osp.join(output_dir, '_temp')):
        shutil.move(osp.join(output_dir, '_temp', filename), osp.join(output_dir, filename))
    shutil.rmtree(osp.join(output_dir, '_temp'))

    # Check whether there are any phosphor dependencies
    has_phosphor = False
    for name in ['devDependencies', 'dependencies']:
        if name not in data:
            continue

        for (key, value) in list(data[name].items()):
            if key.startswith('@phosphor/'):
                has_phosphor = True
                data[name][key.replace('@phosphor/', '@lumino/')] = value

        for key in list(data[name]):
            if key.startswith('@phosphor/'):
                del data[name][key]

    # From the created package.json grab the devDependencies
    with open(osp.join(output_dir, 'package.json')) as fid:
        temp_data = json.load(fid)

    for (key, value) in temp_data['devDependencies'].items():
        data['devDependencies'][key] = value

    # Ask the user whether to upgrade the scripts automatically
    warnings = []
    if interactive:
        choice = input('overwrite scripts in package.json? [n]: ')
    else:
        choice = 'y'
    if choice.upper().startswith('Y'):
        warnings.append('Updated scripts in package.json')
        data.setdefault('scripts', dict())
        for (key, value) in temp_data['scripts'].items():
            data['scripts'][key] = value
        if 'install-ext' in data['scripts']:
            del data['scripts']['install-ext']
    else:
        warnings.append('package.json scripts must be updated manually')

    # Set the output directory
    data['jupyterlab']['outputDir'] = temp_data['jupyterlab']['outputDir']

    # Look for resolutions in JupyterLab metadata and upgrade those as well
    root_jlab_package = pkg_resources.resource_filename('jupyterlab', 'staging/package.json')
    with open(root_jlab_package) as fid:
        root_jlab_data = json.load(fid)

    data.setdefault('dependencies', dict())
    data.setdefault('devDependencies', dict())
    for (key, value) in root_jlab_data['resolutions'].items():
        if key in data['dependencies']:
            data['dependencies'][key] = value.replace('~', '^')
        if key in data['devDependencies']:
            data['devDependencies'][key] = value.replace('~', '^')

    # Sort the entries
    for key in ['scripts', 'dependencies', 'devDependencies']:
        if data[key]:
            data[key] = dict(sorted(data[key].items()))
        else:
            del data[key]

    # Update style settings
    data.setdefault('styleModule', 'style/index.js')
    if 'sideEffects' in data and 'style/index.js' not in data['sideEffects']:
        data['sideEffects'].append('style/index.js')
    if 'files' in data and 'style/index.js' not in data['files']:
        data['files'].append('style/index.js')

    # Update the root package.json file
    with open(package_file, 'w') as fid:
        json.dump(data, fid, indent=2)

    # For the other files, ask about whether to override (when it exists)
    # At the end, list the files that were: added, overridden, skipped
    path = Path(output_dir)
    for p in path.rglob("*"):
        relpath = osp.relpath(p, path)
        if relpath == "package.json":
            continue
        if p.is_dir():
            continue
        file_target = osp.join(target, relpath)
        if not osp.exists(file_target):
            os.makedirs(osp.dirname(file_target), exist_ok=True)
            shutil.copy(p, file_target)
        else:
            with open(p, "rb") as fid:
                old_data = fid.read()
            with open(file_target, "rb") as fid:
                new_data = fid.read()
            if old_data == new_data:
                continue
            if interactive:
                choice = input('overwrite "%s"? [n]: ' % relpath)
            else:
                choice = 'n'
            if choice.upper().startswith('Y'):
                shutil.copy(p, file_target)
            else:
                warnings.append('skipped _temp_extension/%s' % relpath)

    # Print out all warnings
    for warning in warnings:
        print('**', warning)

    print('** Remove _temp_extensions directory when finished')

    if has_phosphor:
        print('** Phosphor dependencies were upgraded to lumino dependencies, update imports as needed')


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Upgrade a JupyterLab extension')

    parser.add_argument('--no-input',
                       action='store_true',
                       help='whether to prompt for information')

    parser.add_argument('path',
                       action='store',
                       type=str,
                       help='the target path')

    parser.add_argument('--branch',
                        help='the template branch to checkout',
                        default=DEFAULT_COOKIECUTTER_BRANCH)

    args = parser.parse_args()

    update_extension(args.path, args.branch, args.no_input==False)
