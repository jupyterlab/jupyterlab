from .labapp import LabApp

try:
    from jupyterhub.singleuser import SingleUserNotebookApp
except ImportError:
    SingleUserLabApp = None
    raise ImportError('You must have jupyterhub installed for this to work.')
else:
    class SingleUserLabApp(SingleUserNotebookApp, LabApp):
        def init_webapp(self, *args, **kwargs):
            super().init_webapp(*args, **kwargs)
            settings = self.web_app.settings
            if 'page_config_data' not in settings:
                settings['page_config_data'] = {}
            settings['page_config_data']['hub_prefix'] = self.hub_prefix
            settings['page_config_data']['hub_host'] = self.hub_host


def main(argv=None):
    return SingleUserLabApp.launch_instance(argv)


if __name__ == "__main__":
    main()
