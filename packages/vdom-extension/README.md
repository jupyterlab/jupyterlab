# vdom-extension

A JupyterLab extension for rendering VirtualDOM using React

![demo](http://g.recordit.co/EIwAIBsGBh.gif)

## Prerequisites

* JupyterLab ^0.27.0

## Usage

To render VDOM output in IPython:

```python
from IPython.display import display

def VDOM(data={}):
    bundle = {}
    bundle['application/vdom.v1+json'] = data
    display(bundle, raw=True)

VDOM({
    'tagName': 'div',
    'attributes': {},
    'children': [{
        'tagName': 'h1',
        'attributes': {},
        'children': 'Our Incredibly Declarative Example',
        'key': 0
    }, {
        'tagName': 'p',
        'attributes': {},
        'children': ['Can you believe we wrote this ', {
            'tagName': 'b',
            'attributes': {},
            'children': 'in Python',
            'key': 1
        }, '?'],
        'key': 1
    }, {
        'tagName': 'img',
        'attributes': {
            'src': 'https://media.giphy.com/media/xUPGcguWZHRC2HyBRS/giphy.gif'
        },
        'key': 2
    }, {
        'tagName': 'p',
        'attributes': {},
        'children': ['What will ', {
            'tagName': 'b',
            'attributes': {},
            'children': 'you',
            'key': 1
        }, ' create next?'],
        'key': 3
    }]
})
```

Using the [vdom Python library](https://github.com/nteract/vdom):

```python
from vdom.helpers import h1, p, img, div, b

div(
    h1('Our Incredibly Declarative Example'),
    p('Can you believe we wrote this ', b('in Python'), '?'),
    img(src="https://media.giphy.com/media/xUPGcguWZHRC2HyBRS/giphy.gif"),
    p('What will ', b('you'), ' create next?'),
)
```

To render a `.vdom` or `.vdom.json` file, simply open it:

## Development

See the [JupyterLab Contributor Documentation](https://github.com/jupyterlab/jupyterlab/blob/master/CONTRIBUTING.md).
