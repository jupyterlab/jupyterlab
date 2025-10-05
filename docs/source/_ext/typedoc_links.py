# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

"""
Sphinx extension for TypeDoc cross-references.
Provides semantic roles for linking to TypeDoc-generated API documentation.
"""

from pathlib import Path

from docutils import nodes
from sphinx.application import Sphinx
from sphinx.domains import Domain
from sphinx.util.docutils import SphinxRole


class TypeDocReference(SphinxRole):
    """Base class for TypeDoc references."""

    def __init__(self, api_type: str):
        # namespaces are currently represented as modules in typedoc output but it might change
        self.api_type = "module" if api_type == "namespace" else api_type
        super().__init__()

    def run(self) -> tuple[list[nodes.Node], list[nodes.system_message]]:
        """Create a reference node for TypeDoc API."""
        target = self.text.strip()

        if "." in target:
            # Parse `module.Member` links
            module, name = target.rsplit(".", 1)
        else:
            # Handle `module` links
            name = target

        api_dir = Path(self.env.srcdir) / "api"
        if not api_dir.exists():
            msg = "JupyterLab API Reference directory not found"
            raise ValueError(msg)

        plural_api = self.api_type + ("es" if self.api_type.endswith("s") else "s")
        path = api_dir / plural_api

        # When classes, namespaces and interfaces get merged, typedoc gives
        # them `-1` or '-2' suffixes to distinguish them internally, even
        # though files land in type-discriminated directories.
        # Here wetry to find the correct suffix.
        possible_files = [
            f"{target}",
            f"{target}-1",
            f"{target}-2",
        ]

        actual_file = None
        for filename in possible_files:
            full_path = path / f"{filename}.html"
            if full_path.exists():
                actual_file = filename
                break

        if not actual_file:
            msg = f"Target not found :ts:{self.api_type}:`{target}` in API Reference. Check type, module name, and typos."
            raise ValueError(msg)

        url = f"../api/{plural_api}/{actual_file}.html"

        # Create the reference node with <code> inside
        code_node = nodes.literal(text=f"{name}")
        ref_node = nodes.reference(
            rawtext=self.rawtext,
            refuri=url,
            classes=["typescript", self.api_type],
        )
        ref_node.append(code_node)

        return [ref_node], []


class TypeScriptDomain(Domain):
    """TypeScript domain for TypeDoc API references."""

    name = "ts"
    label = "TypeScript"

    def __init__(self, env):
        super().__init__(env)

        # Create role functions for each API type
        self.roles = {}
        for api_type in [
            "module",
            "interface",
            "class",
            "namespace",
            "type",
            "variable",
            "function",
        ]:
            self.roles[api_type] = self._create_role(api_type)

    def _create_role(self, api_type: str):
        """Create a role function for a specific API type."""

        def role_function(name, rawtext, text, lineno, inliner, options=None, content=None):
            role_instance = TypeDocReference(api_type)
            role_instance.rawtext = rawtext
            role_instance.text = text
            role_instance.inliner = inliner
            return role_instance.run()

        return role_function

    def role(self, name: str):
        """Return the role function for the given role name."""
        return self.roles.get(name)


def setup(app: Sphinx) -> dict:
    """Setup the TypeDoc links extension."""

    # Register the TypeScript domain
    app.add_domain(TypeScriptDomain)

    return {
        "version": "1.0",
        "parallel_read_safe": True,
        "parallel_write_safe": True,
    }
