from jupyter_server.extension.application import ExtensionApp
from .handlers import PromptAPIHandler, TaskAPIHandler
from importlib_metadata import entry_points
import inspect
from .engine import BaseModelEngine

class GaiExtension(ExtensionApp):
    name = "jupyter_gai"
    handlers = [
        ("api/gai/prompt", PromptAPIHandler),
        (r"api/gai/tasks/?", TaskAPIHandler),
        (r"api/gai/tasks/([\w\-:]*)", TaskAPIHandler)
    ]

    @property
    def gai_engines(self): 
        if "gai_engines" not in self.settings:
            self.settings["gai_engines"] = {}

        return self.settings["gai_engines"]

    def initialize_settings(self):
        eps = entry_points()
        model_engine_class_eps = eps.select(group="jupyter_gai.model_engine_class")
        
        if not model_engine_class_eps:
            self.log.error("No model engines found for jupyter_gai.model_engine_class group. One or more model engines are required for GAI extension to work.")
            return

        for model_engine_class_ep in model_engine_class_eps:
            try:
                Engine = model_engine_class_ep.load()
            except:
                self.log.error(f"Unable to load model engine class from entry point `{model_engine_class_ep.name}`.")
                continue

            if not inspect.isclass(Engine) or not issubclass(Engine, BaseModelEngine):
                self.log.error(f"Unable to instantiate model engine class from entry point `{model_engine_class_ep.name}` as it is not a subclass of `BaseModelEngine`.")
                continue

            try:
                self.gai_engines[Engine.name] = Engine(config=self.config, log=self.log)
            except:
                self.log.error(f"Unable to instantiate model engine class from entry point `{model_engine_class_ep.name}`.")
                continue

            self.log.info(f"Registered engine `{Engine.name}`.")

        self.log.info(f"Registered {self.name} server extension")