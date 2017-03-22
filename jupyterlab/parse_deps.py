import json

# get the data
with open('depdata.json') as fid:
    data = dict(json.load(fid))


# Now we check for duplicates of packages
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


# Now, for each dupe check for overlapping semver
for dupe in dupes:
    sources = []
    for (pkg, value) in data.items():
        if dupe in value['dependencies']:
            sources.append(pkg)
    print(sources)

# Finally, check for any dupes that are marked as singletons

