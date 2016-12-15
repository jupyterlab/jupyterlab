import os
import sys

from flexx_labext import register_flexx_jlab_plugin

from flexx import app, event, ui


# todo: make this add a menu entry - once we can create a Phosphor Menu

@register_flexx_jlab_plugin
class CondaManagerPlugin(ui.Widget):
    """
    A widget that can display the environments for the current Python
    interpreter, assuming its a conda env. This could be extended to 
    allow installing, updating and removing packages.
    
    This example also demonstrates adding a command to the palette.
    """
    
    def init(self):
        with ui.VBox():
            # self._refresh_but = ui.Button(text='Refresh')
            self._label = ui.Label()
            self._tree = ui.TreeWidget(flex=1, max_selected=1)
        
        app.call_later(0.1, self.detect_envs)
    
    #@event.connect('_refresh_but.mouse_click', 'update_envs')
    @event.connect('update_envs')
    def detect_envs(self, *events):
        """ Detect environments and make a tree item for each.
        """
        # Get prefix, check whether we are in a root env
        prefix = sys.prefix
        env_sub = os.path.sep + 'envs' + os.path.sep
        if env_sub in prefix:
            self._label.text = 'Must be in a root env to use this widget'
            raise ValueError(self._label.text)
            #prefix = prefix.split(env_sub)[0]
        
        # Let the user know where we're looking
        self._label.text = 'Showing conda environments in: ' + prefix
        
        # Collect env names
        env_names = ['root']
        env_dir = os.path.join(sys.prefix, 'envs')
        if os.path.isdir(env_dir):
            for dname in sorted(os.listdir(env_dir)):
                if os.path.isdir(os.path.join(env_dir, dname)):
                    env_names.append(dname)
        
        # Create base tree items
        self._tree.items = ()  # i.e. clear
        with self._tree:
            for env_name in env_names:
                item = ui.TreeItem(title=env_name, collapsed=True)
    
    @event.connect('_tree.items*.collapsed')
    def _collect_packages(self, *events):
        """ When a base tree item is expanded, we detect all the packages
        in the corresponding env and list them in the tree.
        """ 
        for ev in events:
            
            item = ev.source
            if not item.collapsed:  # expanded
                
                env_name = item.title
                item.text = 'working ...'
                # Do conda command
                try:
                    text = conda_cmd('conda list -n %s' % env_name)
                except Exception as err:
                    print(err)
                    continue
                # Parse
                libinfos = []
                for line in text.splitlines():
                    line = line.split('#')[0].strip().replace('\t', '  ')
                    if not line:
                        continue
                    parts = [part for part in line.split(' ') if part]
                    libinfos.append((parts[0], '  '.join(parts[1:])))
                # Create subitems
                item.items = ()
                with item:
                    for libinfo in libinfos:
                        ui.TreeItem(title=libinfo[0], text=libinfo[1])
                item.text = '%i libraries' % len(item.items)
    
    class JS:
        
        JLAB_AUTOSTART = True
        JLAB_REQUIRES = ['jupyter.services.main-menu', 'jupyter.services.commandpalette']
        
        @event.emitter
        def update_envs(self):
            """ Event emitter that the Py side listens to to update the env list.
            """
            return {}
        
        def jlab_activate(self, lab, menu, commands):
            self.title = 'Conda manager'
            window.commands = commands
            lab.shell.addToMainArea(self.phosphor)
            
            # Create command
            command_id = 'conda-manager:update'
            lab.commands.addCommand(command_id,
                dict(execute=self.update_envs, label='Update conda manager envs'))
            # Add our command(s) to the palette
            commands.addItem(dict(category='Conda manager', command=command_id))
            # Create key binding for our command(s)
            # todo: this does not work, why?
            lab.keymap.addBinding(dict(command=command_id,
                                       keys=['R'],
                                       # selector='.flx-CondaManagerPlugin'
                                       ))


def conda_cmd(command):
    """ Util method to programatically do a conda command.
    """
    # Get command args
    args = command.split(' ')
    args = [w for w in args if w]
    if args[0] != 'conda':
        raise ValueError('Conda command should start with "conda".')
    
    oldargs = sys.argv
    stderr_write = sys.stderr.write
    stdout_write = sys.stdout.write
    lines = []
    try:
        sys.stderr.write = lambda x: len(x)
        sys.stdout.write = lambda x: lines.append(x) or len(x)
        import conda
        from conda.cli import main
        sys.argv = args
        main()
    except SystemExit:  # as err:
        type, err, tb = sys.exc_info(); del tb
        err = str(err)
        if len(err) > 4:  # Only print if looks like a message
            raise RuntimeError(err)
    except Exception:  # as err:
        type, err, tb = sys.exc_info(); del tb
        raise RuntimeError('Error in conda command: ' + str(err))
    finally:
        sys.argv = oldargs
        sys.stderr.write = stderr_write
        sys.stdout.write = stdout_write
    
    return ''.join(lines)
