from .labapp import LabApp


def load_jupyter_server_extension(serverapp):
    """Temporary server extension shim when using
    old notebook server.
    """
    extension = LabApp()
    extension.serverapp = serverapp
    extension.load_config_file()
    extension.update_config(serverapp.config)
    extension.parse_command_line(serverapp.extra_args)
    extension.initialize()