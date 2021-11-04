import getpass
from tempfile import mkdtemp

# Test if we are running in a docker
if getpass.getuser() == "jovyan":
    c.ServerApp.ip = "0.0.0.0"

c.ServerApp.port = 8888
c.ServerApp.port_retries = 0
c.ServerApp.open_browser = False
c.LabApp.dev_mode = True

c.ServerApp.root_dir = mkdtemp(prefix='galata-test-')
c.ServerApp.token = ""
c.ServerApp.password = ""
c.ServerApp.disable_check_xsrf = True
c.LabApp.expose_app_in_browser = True
