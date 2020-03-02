# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

from flask import Flask, g, send_from_directory
from flask_cors import CORS

PORT = 8080

ROOT_FOLDER='./'

app = Flask(__name__, static_folder = ROOT_FOLDER)

CORS(app)

@app.route('/listings/<path:path>', defaults = {'listings': 'listingws'})
def res(folder, path):
    return send_from_directory(ROOT_FOLDER + listings, path)

if __name__ == '__main__':
    print('http://localhost:8080/lists/blacklist.json')
    print('http://localhost:8080/lists/whitelist.json')
    app.run(
        host='0.0.0.0',
        port = PORT,
        threaded = True,
        processes = 1,
        )
