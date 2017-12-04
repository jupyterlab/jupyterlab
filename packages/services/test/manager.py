# -*- coding: utf-8 -*-
from jupyter_client.kernelspec import KernelSpecManager


class TestKernelSpecManager(KernelSpecManager):
    """ A custom KernelSpecManager for testing.
    """

    def find_kernel_specs(self):
        """ Returns a dict mapping kernel names to resource directories.
        """
        kspecs = super(TestKernelSpecManager, self).find_kernel_specs()

        # add conda envs kernelspecs
        kspecs.update({name: spec.resource_dir
                       for name, spec
                       in self._kspecs.items()})
        return kspecs

    def get_kernel_spec(self, kernel_name):
        """ Returns a :class:`KernelSpec` instance for the given kernel_name.
        """

        return (
            self._kspecs.get(kernel_name) or
            super(TestKernelSpecManager, self).get_kernel_spec(kernel_name)
        )
