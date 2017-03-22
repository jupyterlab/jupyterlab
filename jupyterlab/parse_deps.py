from collections import defaultdict
import json


# get the data
with open('depdata.json') as fid:
    data = dict(json.load(fid))


# Now we check for duplicates of packages
dupes = defaultdict(list)

for key in data:
    base = key[0] + key[1:].split('@')[0]
    dupes[base].append(key)

for key in list(dupes.keys()):
    if len(dupes[key]) == 1:
        del dupes[key]


# Now, for each dupe check for overlapping semver


# Finally, check for any dupes that are marked as singletons

