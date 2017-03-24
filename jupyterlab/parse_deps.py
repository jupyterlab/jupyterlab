from collections import defaultdict
import json
from distutils.version import LooseVersion
from semver import max_satisfying, satisfies


def handle_deps(data):
    """Handle the dependencies in a package data tree. 

    Parameters
    ----------
    data: dict
        The dependency tree. 

    
    Returns
    -------
    A list of packages to remove. 


    Raises
    ------
    ValueError if a singleton package cannot be deduplicated. 
    """
    # Check for duplicates of packages.
    seen = dict()
    dupes = dict()
    singletons = set()

    for (key, value) in data.items():
        name = value['name']
        if name in seen:
            if name not in dupes:
                dupes[name] = [seen[name]]
            dupes[name].append(key)
        else:
            seen[name] = key
        jlab = value.get('jupyterlab', {})
        if 'singletonPackages' in jlab:
            for package in jlab['singletonPackages']:
                singletons.add(package)

    # For each dupe check for overlapping semver.
    to_remove = []
    for (key, value) in dupes.items():
        try:
            to_remove.extend(handle_dupe(data, key, value))
        except ValueError as e:
            if key in singletons:
                raise e
            else:
                print(e)

    print('singletons', singletons)
    print('to_remove', to_remove)


def handle_dupe(data, name, dupes):
    """Handle a duplicate package. 

    Attempt to find the best overlapping package version, and provide
    a list of the other packages to remove.

    Parameters
    ----------
    data: dict
        The dependency tree.
    name: str
        The name of the duplicate package. 
    dupes: list of dicts
        The available packages for the given name.

    
    Returns
    -------
    The list of duplicate packages to remove. 

    Raises
    ------
    ValueError when the conflict cannot be resolved.
    """
    deps = dict()
    best = dict()
    sats = defaultdict(list)
    versions = [data[k]['version'] for k in dupes]
    # sort the versions in decreasing order
    versions.sort(key=LooseVersion)
    to_remove = []

    # Check the version compatibility of each dupe.
    for (key, value) in data.items():
        if name in value['dependencies']:
            deps[key] = value['dependencies'][name]
            best[key] = max_satisfying(versions, deps[key], False)
            for version in versions:
                sats[version].append(satisfies(version, deps[key], False))

    # Find the best match and remove the others.
    for version in versions:
        if all(sats[version]):
            # handle the replacements
            for dep in deps:
                if data[dep]['version'] == version:
                    continue
                to_remove.append(name + '@' + version)
            return to_remove

    # Could not find a match, raise Error.
    raise ValueError('"%s" is a duplicate' % name)


if __name__ == '__main__':
    # Get the data.
    with open('depdata.json') as fid:
        data = dict(json.load(fid))

    handle_deps(data)
