from collections import defaultdict
import json
from distutils.version import LooseVersion
from semver import max_satisfying, satisfies

# Get the data.
with open('depdata.json') as fid:
    data = dict(json.load(fid))


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
replacements = dict()
for dupe in dupes:
    deps = dict()
    best = dict()
    sats = defaultdict(list)
    versions = [data[k]['version'] for k in dupes[dupe]]
    # sort the versions in decreasing order
    versions.sort(key=LooseVersion)

    # Check the version compatibility of each dupe.
    for (key, value) in data.items():
        if dupe in value['dependencies']:
            deps[key] = value['dependencies'][dupe]
            best[key] = max_satisfying(versions, deps[key], False)
            for version in versions:
                sats[version].append(satisfies(version, deps[key], False))

    # Prefer all best being the same.
    if all(best.values()) == list(best.values())[0]:
        break
    # Then find the best of the remaining overlap.
    good = []
    for version in versions:
        if all(sats[version]):
            # handle the replacements
            for dep in deps:
                replacements[dep] = dupe + '@' + version
            break

    # If there is no overlap, make sure it is not marked as a singleton.
    # TODO: handle singleton data.
    raise ValueError('"%s" must be a singleton' % dupe)
