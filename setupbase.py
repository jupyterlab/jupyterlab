
import os
import pipes
import sys

from distutils import log
from distutils.cmd import Command
from subprocess import check_call


if sys.platform == 'win32':
    from subprocess import list2cmdline
else:
    def list2cmdline(cmd_list):
        return ' '.join(map(pipes.quote, cmd_list))


here = os.path.dirname(os.path.abspath(__file__))
is_repo = os.path.exists(os.path.join(here, '.git'))


def run(cmd, *args, **kwargs):
    """Echo a command before running it"""
    log.info('> ' + list2cmdline(cmd))
    kwargs['shell'] = (sys.platform == 'win32')
    return check_call(cmd, *args, **kwargs)


#---------------------------------------------------------------------------
# Find packages
#---------------------------------------------------------------------------

def find_packages():
    """
    Find all of the packages.
    """
    packages = []
    for dir, subdirs, files in os.walk('jupyterlab'):
        package = dir.replace(os.path.sep, '.')
        if '__init__.py' not in files:
            # not a package
            continue
        packages.append(package)
    return packages


def js_prerelease(command, strict=False):
    """decorator for building minified js/css prior to another command"""
    class DecoratedCommand(command):
        def run(self):
            jsdeps = self.distribution.get_command_obj('jsdeps')
            if not is_repo and all(os.path.exists(t) for t in jsdeps.targets):
                # sdist, nothing to do
                command.run(self)
                return

            try:
                self.distribution.run_command('jsdeps')
            except Exception as e:
                missing = [t for t in jsdeps.targets if not os.path.exists(t)]
                if strict or missing:
                    log.warn('rebuilding js and css failed')
                    if missing:
                        log.error('missing files: %s' % missing)
                    raise e
                else:
                    log.warn('rebuilding js and css failed (not a problem)')
                    log.warn(str(e))
            command.run(self)
    return DecoratedCommand


def update_package_data(distribution):
    """update build_py options to get package_data changes"""
    build_py = distribution.get_command_obj('build_py')
    build_py.finalize_options()


class NPM(Command):
    description = 'install package.json dependencies using npm'

    user_options = []

    # Representative files that should exist after a successful build
    targets = [
        os.path.join(here, 'jupyterlab', 'build', 'main.css'),
        os.path.join(here, 'jupyterlab', 'build', 'main.bundle.js'),
    ]

    def initialize_options(self):
        pass

    def finalize_options(self):
        pass

    def has_npm(self):
        try:
            run(['npm', '--version'])
            return True
        except:
            return False

    def run(self):
        has_npm = self.has_npm()
        if not has_npm:
            log.error("`npm` unavailable. If you're running this command using sudo, make sure `npm` is available to sudo")
        log.info("Installing build dependencies with npm. This may take a while...")
        run(['npm', 'install'], cwd=here)
        run(['npm', 'run', 'build:serverextension'], cwd=here)

        for t in self.targets:
            if not os.path.exists(t):
                msg = 'Missing file: %s' % t
                if not has_npm:
                    msg += '\nnpm is required to build the development version'
                raise ValueError(msg)

        # update package data in case this created new files
        update_package_data(self.distribution)
