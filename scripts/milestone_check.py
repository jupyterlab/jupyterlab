# Copyright (c) 2018 Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

# Generate a GitHub token at https://github.com/settings/tokens
# Invoke this script using something like:
# python scripts/milestone_check.py

import subprocess
import requests
import os

try:
  api_token = os.environ['GITHUB_TOKEN']
except KeyError:
  print('Error: set the environment variable GITHUB_TOKEN to a GitHub authentication token (see https://github.com/settings/tokens)')
  exit(1)

MILESTONE=18

ranges = {
    18: 'origin/master --not origin/0.34.x' #0.35.0
}

out = subprocess.run("git log {} --format='%H,%cE,%s'".format(ranges[MILESTONE]), shell=True, encoding='utf8', stdout=subprocess.PIPE)
commits = {i[0]: (i[1], i[2]) for i in (x.split(',',2) for x in out.stdout.splitlines())}


url = 'https://api.github.com/graphql'
json = { 'query' : """
query test($milestone: Int!) {
    repository(owner:"jupyterlab" name:"jupyterlab") {
      milestone(number:$milestone) {
        title
        pullRequests(first:100 states:[MERGED]) {
          nodes {
            title
            number
            mergeCommit {
              oid
            }
            commits(first:100) {
              nodes {
                commit {
                  oid
                }
              }
            }
          }
        }
      }
    }
  }
""",
       'variables': {
           'milestone': MILESTONE
       }
       }

headers = {'Authorization': 'token %s' % api_token}

r = requests.post(url=url, json=json, headers=headers)
milestone_data = r.json()['data']['repository']['milestone']
pr_list = milestone_data['pullRequests']['nodes']

# construct a commit to PR dictionary
prs = {}
for pr in pr_list:
    prs[pr['number']] = {'mergeCommit': pr['mergeCommit']['oid'],
                        'commits': set(i['commit']['oid'] for i in pr['commits']['nodes'])}
    
# Reverse dictionary
commits_to_prs={}
for key,value in prs.items():
    commits_to_prs[value['mergeCommit']]=key
    for c in value['commits']:
        commits_to_prs[c]=key

# Check to see if commits in the repo are represented in PRs
good = set()
notfound = set()
for c in commits:
    if c in commits_to_prs:
        good.add(commits_to_prs[c])
    else:
        notfound.add(c)

prs_not_represented = set(prs.keys()) - good

print("Milestone: %s, %d merged PRs"%(milestone_data['title'], len(milestone_data['pullRequests']['nodes'])))
print("""
PRs that are in the milestone, but have no commits in the version range. 
These PRs probably belong in a different milestone.
""")
print('\n'.join('https://github.com/jupyterlab/jupyterlab/pull/%d'%i for i in prs_not_represented))

print('-'*40)

print("""
Commits that are not included in any PR on this milestone.
This probably means the commit's PR needs to be assigned to this milestone,
or the commit was pushed to master directly.
""")
print('\n'.join('%s %s %s'%(c, commits[c][0], commits[c][1]) for c in notfound))
