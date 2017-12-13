

import pexpect
child = pexpect.spawn('node buildutils/lib/create-theme.js')
child.expect('name:')
child.sendline('foo')
child.expect('title:')
child.sendline('Foo')
child.expect('description:')
child.sendline('foo theme')
child.expect('Created new theme')
