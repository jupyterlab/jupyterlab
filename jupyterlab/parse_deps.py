from collections import defaultdict
import json
from distutils.version import LooseVersion
from semver import max_satisfying, satisfies


def handle_deps(data):
    # Check for duplicates of packages.
    seen = dict()
    dupes = dict()

    for (key, value) in data.items():
        name = value['name']
        if name in seen:
            if name not in dupes:
                dupes[name] = [seen[name]]
            dupes[name].append(key)
        else:
            seen[name] = key

    # For each dupe check for overlapping semver.
    to_remove = []
    for (key, value) in dupes.items():
        to_remove.extend(handle_dupe(data, key, value))

    print('We should remove %s' % to_remove)


def handle_dupe(data, name, dupes):
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

    # Prefer all best being the same.
    if all(best.values()) == list(best.values())[0]:
        return to_remove

    # Then find the best of the remaining overlap.
    for version in versions:
        if all(sats[version]):
            # handle the replacements
            for dep in deps:
                if data[dep]['version'] == version:
                    continue
                to_remove.append(name + '@' + version)
            return to_remove

    # If there is no overlap, make sure it is not marked as a singleton.
    # TODO: handle singleton data.
    print('*** "%s" must be a singleton' % name)

    return to_remove


if __name__ == '__main__':
    # Get the data.
    with open('depdata.json') as fid:
        data = dict(json.load(fid))

    handle_deps(data)
