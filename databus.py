import IPython.display

def display_dataset(mime_type, url, data):
    IPython.display.publish_display_data({
        'text/plain': f'Dataset: {url}, {mime_type}, {data}',
        'application/x.jupyter.dataset+json': {
            "mimeType": mime_type,
            "url": url,
            "data": data
        }
    })