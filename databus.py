import IPython.display
import pandas

def display_dataset(mime_type, url, data):
    IPython.display.publish_display_data({
        'text/plain': f'Dataset: {url}, {mime_type}, {data}',
        'application/x.jupyter.dataset+json': {
            "mimeType": mime_type,
            "url": url,
            "data": data
        }
    })

def display_url_dataset(mime_type, url):
    display_dataset(f'application/x.jupyter.url; mimeType={mime_type}', url, url)

def display_file_dataset(mime_type, path):
    display_dataset(f'application/x.jupyter.file; mimeType={mime_type}', f"file:///{path}", path)

    
def display_pandas_dataset(dataframe):
    path = './tmp.csv'
    dataframe.to_csv(path, index=False)
    display_file_dataset("text/csv", path)