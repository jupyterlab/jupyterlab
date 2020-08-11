#!/usr/bin/env python
import asyncio
import os
from urllib.parse import urlparse

from traitlets import (
    Any,
    Bool,
    Bytes,
    Integer,
    Unicode,
    CUnicode,
    default,
    observe,
    validate,
    TraitError,
)

from jupyterhub.singleuser import (
    dedent, exponential_backoff, make_ssl_context, url_path_join, _check_version, _exclude_home, 
    ChoiceLoader, HubOAuth, JupyterHubLoginHandler, JupyterHubLogoutHandler
)

from tornado.httpclient import AsyncHTTPClient
from tornado.httpclient import HTTPRequest

from .labapp import LabApp, aliases as lab_aliases, flags as lab_flags
from ._version import __version__


# register new hub related command-line aliases
aliases = dict(lab_flags)
aliases.update(
    {
        'user': 'SingleUserNotebookApp.user',
        'group': 'SingleUserNotebookApp.group',
        'cookie-name': 'HubAuth.cookie_name',
        'hub-prefix': 'SingleUserNotebookApp.hub_prefix',
        'hub-host': 'SingleUserNotebookApp.hub_host',
        'hub-api-url': 'SingleUserNotebookApp.hub_api_url',
        'base-url': 'SingleUserNotebookApp.base_url',
    }
)
flags = dict(lab_flags)
flags.update(
    {
        'disable-user-config': (
            {'SingleUserNotebookApp': {'disable_user_config': True}},
            "Disable user-controlled configuration of the notebook server.",
        )
    }
)


# FIXME: Use from jupyterhub.mixins import make_singleuser_app when available
class SingleUserNotebookApp(LabApp):
    """A Subclass of the regular LabApp that is aware of the parent multiuser context."""

    description = dedent(
        """
    Single-user server for JupyterHub. Extends the Jupyter Notebook server.

    Meant to be invoked by JupyterHub Spawners, and not directly.
    """
    )

    examples = ""
    subcommands = {}
    version = __version__
    classes = LabApp.classes + [HubOAuth]

    # disable single-user app's localhost checking
    allow_remote_access = True

    # don't store cookie secrets
    cookie_secret_file = ''
    # always generate a new cookie secret on launch
    # ensures that each spawn clears any cookies from previous session,
    # triggering OAuth again
    cookie_secret = Bytes()

    def _cookie_secret_default(self):
        return os.urandom(32)

    user = CUnicode().tag(config=True)
    group = CUnicode().tag(config=True)

    @default('user')
    def _default_user(self):
        return os.environ.get('JUPYTERHUB_USER') or ''

    @default('group')
    def _default_group(self):
        return os.environ.get('JUPYTERHUB_GROUP') or ''

    @observe('user')
    def _user_changed(self, change):
        self.log.name = change.new

    hub_host = Unicode().tag(config=True)

    hub_prefix = Unicode('/hub/').tag(config=True)

    @default('keyfile')
    def _keyfile_default(self):
        return os.environ.get('JUPYTERHUB_SSL_KEYFILE') or ''

    @default('certfile')
    def _certfile_default(self):
        return os.environ.get('JUPYTERHUB_SSL_CERTFILE') or ''

    @default('client_ca')
    def _client_ca_default(self):
        return os.environ.get('JUPYTERHUB_SSL_CLIENT_CA') or ''

    @default('hub_prefix')
    def _hub_prefix_default(self):
        base_url = os.environ.get('JUPYTERHUB_BASE_URL') or '/'
        return base_url + 'hub/'

    hub_api_url = Unicode().tag(config=True)

    @default('hub_api_url')
    def _hub_api_url_default(self):
        return os.environ.get('JUPYTERHUB_API_URL') or 'http://127.0.0.1:8081/hub/api'

    # defaults for some configurables that may come from service env variables:
    @default('base_url')
    def _base_url_default(self):
        return os.environ.get('JUPYTERHUB_SERVICE_PREFIX') or '/'

    # Note: this may be removed if notebook module is >= 5.0.0b1
    @validate('base_url')
    def _validate_base_url(self, proposal):
        """ensure base_url starts and ends with /"""
        value = proposal.value
        if not value.startswith('/'):
            value = '/' + value
        if not value.endswith('/'):
            value = value + '/'
        return value

    @default('port')
    def _port_default(self):
        if os.environ.get('JUPYTERHUB_SERVICE_URL'):
            url = urlparse(os.environ['JUPYTERHUB_SERVICE_URL'])
            if url.port:
                return url.port
            elif url.scheme == 'http':
                return 80
            elif url.scheme == 'https':
                return 443
        return 8888

    @default('ip')
    def _ip_default(self):
        if os.environ.get('JUPYTERHUB_SERVICE_URL'):
            url = urlparse(os.environ['JUPYTERHUB_SERVICE_URL'])
            if url.hostname:
                return url.hostname
        return '127.0.0.1'

    aliases = aliases
    flags = flags

    # disble some single-user configurables
    token = ''
    open_browser = False
    quit_button = False
    trust_xheaders = True
    login_handler_class = JupyterHubLoginHandler
    logout_handler_class = JupyterHubLogoutHandler
    port_retries = (
        0  # disable port-retries, since the Spawner will tell us what port to use
    )

    disable_user_config = Bool(
        False,
        help="""Disable user configuration of single-user server.

        Prevents user-writable files that normally configure the single-user server
        from being loaded, ensuring admins have full control of configuration.
        """,
    ).tag(config=True)

    @validate('notebook_dir')
    def _notebook_dir_validate(self, proposal):
        value = os.path.expanduser(proposal['value'])
        # Strip any trailing slashes
        # *except* if it's root
        _, path = os.path.splitdrive(value)
        if path == os.sep:
            return value
        value = value.rstrip(os.sep)
        if not os.path.isabs(value):
            # If we receive a non-absolute path, make it absolute.
            value = os.path.abspath(value)
        if not os.path.isdir(value):
            raise TraitError("No such notebook dir: %r" % value)
        return value

    @default('log_datefmt')
    def _log_datefmt_default(self):
        """Exclude date from default date format"""
        return "%Y-%m-%d %H:%M:%S"

    @default('log_format')
    def _log_format_default(self):
        """override default log format to include time"""
        return "%(color)s[%(levelname)1.1s %(asctime)s.%(msecs).03d %(name)s %(module)s:%(lineno)d]%(end_color)s %(message)s"

    def _confirm_exit(self):
        # disable the exit confirmation for background notebook processes
        self.io_loop.add_callback_from_signal(self.io_loop.stop)

    def migrate_config(self):
        if self.disable_user_config:
            # disable config-migration when user config is disabled
            return
        else:
            super(SingleUserNotebookApp, self).migrate_config()

    @property
    def config_file_paths(self):
        path = super(SingleUserNotebookApp, self).config_file_paths

        if self.disable_user_config:
            # filter out user-writable config dirs if user config is disabled
            path = list(_exclude_home(path))
        return path

    @property
    def nbextensions_path(self):
        path = super(SingleUserNotebookApp, self).nbextensions_path

        if self.disable_user_config:
            path = list(_exclude_home(path))
        return path

    @validate('static_custom_path')
    def _validate_static_custom_path(self, proposal):
        path = proposal['value']
        if self.disable_user_config:
            path = list(_exclude_home(path))
        return path

    # create dynamic default http client,
    # configured with any relevant ssl config
    hub_http_client = Any()

    @default('hub_http_client')
    def _default_client(self):
        ssl_context = make_ssl_context(
            self.keyfile, self.certfile, cafile=self.client_ca
        )
        AsyncHTTPClient.configure(None, defaults={"ssl_options": ssl_context})
        return AsyncHTTPClient()

    async def check_hub_version(self):
        """Test a connection to my Hub

        - exit if I can't connect at all
        - check version and warn on sufficient mismatch
        """
        client = self.hub_http_client
        RETRIES = 5
        for i in range(1, RETRIES + 1):
            try:
                resp = await client.fetch(self.hub_api_url)
            except Exception:
                self.log.exception(
                    "Failed to connect to my Hub at %s (attempt %i/%i). Is it running?",
                    self.hub_api_url,
                    i,
                    RETRIES,
                )
                await gen.sleep(min(2 ** i, 16))
            else:
                break
        else:
            self.exit(1)

        hub_version = resp.headers.get('X-JupyterHub-Version')
        _check_version(hub_version, __version__, self.log)

    server_name = Unicode()

    @default('server_name')
    def _server_name_default(self):
        return os.environ.get('JUPYTERHUB_SERVER_NAME', '')

    hub_activity_url = Unicode(
        config=True, help="URL for sending JupyterHub activity updates"
    )

    @default('hub_activity_url')
    def _default_activity_url(self):
        return os.environ.get('JUPYTERHUB_ACTIVITY_URL', '')

    hub_activity_interval = Integer(
        300,
        config=True,
        help="""
        Interval (in seconds) on which to update the Hub
        with our latest activity.
        """,
    )

    @default('hub_activity_interval')
    def _default_activity_interval(self):
        env_value = os.environ.get('JUPYTERHUB_ACTIVITY_INTERVAL')
        if env_value:
            return int(env_value)
        else:
            return 300

    _last_activity_sent = Any(allow_none=True)

    async def notify_activity(self):
        """Notify jupyterhub of activity"""
        client = self.hub_http_client
        last_activity = self.web_app.last_activity()
        if not last_activity:
            self.log.debug("No activity to send to the Hub")
            return
        if last_activity:
            # protect against mixed timezone comparisons
            if not last_activity.tzinfo:
                # assume naive timestamps are utc
                self.log.warning("last activity is using naive timestamps")
                last_activity = last_activity.replace(tzinfo=timezone.utc)

        if self._last_activity_sent and last_activity < self._last_activity_sent:
            self.log.debug("No activity since %s", self._last_activity_sent)
            return

        last_activity_timestamp = isoformat(last_activity)

        async def notify():
            self.log.debug("Notifying Hub of activity %s", last_activity_timestamp)
            req = HTTPRequest(
                url=self.hub_activity_url,
                method='POST',
                headers={
                    "Authorization": "token {}".format(self.hub_auth.api_token),
                    "Content-Type": "application/json",
                },
                body=json.dumps(
                    {
                        'servers': {
                            self.server_name: {'last_activity': last_activity_timestamp}
                        },
                        'last_activity': last_activity_timestamp,
                    }
                ),
            )
            try:
                await client.fetch(req)
            except Exception:
                self.log.exception("Error notifying Hub of activity")
                return False
            else:
                return True

        await exponential_backoff(
            notify,
            fail_message="Failed to notify Hub of activity",
            start_wait=1,
            max_wait=15,
            timeout=60,
        )
        self._last_activity_sent = last_activity

    async def keep_activity_updated(self):
        if not self.hub_activity_url or not self.hub_activity_interval:
            self.log.warning("Activity events disabled")
            return
        self.log.info(
            "Updating Hub with activity every %s seconds", self.hub_activity_interval
        )
        while True:
            try:
                await self.notify_activity()
            except Exception as e:
                self.log.exception("Error notifying Hub of activity")
            # add 20% jitter to the interval to avoid alignment
            # of lots of requests from user servers
            t = self.hub_activity_interval * (1 + 0.2 * (random.random() - 0.5))
            await asyncio.sleep(t)

    def initialize(self, argv=None):
        # disable trash by default
        # this can be re-enabled by config
        self.config.FileContentsManager.delete_to_trash = False
        return super().initialize(argv)

    def start(self):
        self.log.info("Starting jupyterhub-singleuser server version %s", __version__)
        # start by hitting Hub to check version
        ioloop.IOLoop.current().run_sync(self.check_hub_version)
        ioloop.IOLoop.current().add_callback(self.keep_activity_updated)
        super(SingleUserNotebookApp, self).start()

    def init_hub_auth(self):
        api_token = None
        if os.getenv('JPY_API_TOKEN'):
            # Deprecated env variable (as of 0.7.2)
            api_token = os.environ['JPY_API_TOKEN']
        if os.getenv('JUPYTERHUB_API_TOKEN'):
            api_token = os.environ['JUPYTERHUB_API_TOKEN']

        if not api_token:
            self.exit(
                "JUPYTERHUB_API_TOKEN env is required to run jupyterhub-singleuser. Did you launch it manually?"
            )
        self.hub_auth = HubOAuth(
            parent=self,
            api_token=api_token,
            api_url=self.hub_api_url,
            hub_prefix=self.hub_prefix,
            base_url=self.base_url,
            keyfile=self.keyfile,
            certfile=self.certfile,
            client_ca=self.client_ca,
        )
        # smoke check
        if not self.hub_auth.oauth_client_id:
            raise ValueError("Missing OAuth client ID")

    def init_webapp(self):
        # load the hub-related settings into the tornado settings dict
        self.init_hub_auth()
        s = self.tornado_settings
        s['log_function'] = log_request
        s['user'] = self.user
        s['group'] = self.group
        s['hub_prefix'] = self.hub_prefix
        s['hub_host'] = self.hub_host
        s['hub_auth'] = self.hub_auth
        csp_report_uri = s['csp_report_uri'] = self.hub_host + url_path_join(
            self.hub_prefix, 'security/csp-report'
        )
        headers = s.setdefault('headers', {})
        headers['X-JupyterHub-Version'] = __version__
        # set CSP header directly to workaround bugs in jupyter/notebook 5.0
        headers.setdefault(
            'Content-Security-Policy',
            ';'.join(["frame-ancestors 'self'", "report-uri " + csp_report_uri]),
        )
        super(SingleUserNotebookApp, self).init_webapp()

        # add OAuth callback
        self.web_app.add_handlers(
            r".*$",
            [(urlparse(self.hub_auth.oauth_redirect_uri).path, OAuthCallbackHandler)],
        )

        # apply X-JupyterHub-Version to *all* request handlers (even redirects)
        self.patch_default_headers()
        self.patch_templates()

    def patch_default_headers(self):
        if hasattr(RequestHandler, '_orig_set_default_headers'):
            return
        RequestHandler._orig_set_default_headers = RequestHandler.set_default_headers

        def set_jupyterhub_header(self):
            self._orig_set_default_headers()
            self.set_header('X-JupyterHub-Version', __version__)

        RequestHandler.set_default_headers = set_jupyterhub_header

    def patch_templates(self):
        """Patch page templates to add Hub-related buttons"""

        self.jinja_template_vars['logo_url'] = self.hub_host + url_path_join(
            self.hub_prefix, 'logo'
        )
        self.jinja_template_vars['hub_host'] = self.hub_host
        self.jinja_template_vars['hub_prefix'] = self.hub_prefix
        env = self.web_app.settings['jinja2_env']

        env.globals['hub_control_panel_url'] = self.hub_host + url_path_join(
            self.hub_prefix, 'home'
        )

        # patch jinja env loading to modify page template
        def get_page(name):
            if name == 'page.html':
                return page_template

        orig_loader = env.loader
        env.loader = ChoiceLoader([FunctionLoader(get_page), orig_loader])


def main(argv=None):
    return SingleUserNotebookApp.launch_instance(argv)


if __name__ == "__main__":
    main()
