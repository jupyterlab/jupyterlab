import json

import tornado
from tornado.web import HTTPError
from pydantic import ValidationError

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import ensure_async
from .task_manager import TaskManager
from .models import PromptRequest

class PromptAPIHandler(APIHandler):
    @property
    def gai_engines(self): 
        return self.settings["gai_engines"]

    @property
    def task_manager(self):
        # we have to create the TaskManager lazily, since no event loop is
        # running in ServerApp.initialize_settings().
        if "task_manager" not in self.settings:
            self.settings["task_manager"] = TaskManager(gai_engines=self.settings["gai_engines"])
        return self.settings["task_manager"]
    
    @tornado.web.authenticated
    async def post(self):
        try:
            request = PromptRequest(**self.get_json_body())
        except ValidationError as e:
            self.log.exception(e)
            raise HTTPError(500, str(e)) from e
        
        task = await self.task_manager.describe_task(request.task_id)
        if not task:
            raise HTTPError(404, f"Task not found with ID: {request.task_id}")
        if task.engine not in self.gai_engines:
            raise HTTPError(500, f"Model engine not registered: {task.engine}")
        
        engine = self.gai_engines[task.engine]
        output = await ensure_async(engine.execute(task, request.prompt_variables))

        self.finish(json.dumps({
            "output": output,
            "insertion_mode": task.insertion_mode
        }))

class TaskAPIHandler(APIHandler):
    @property
    def task_manager(self):
        # we have to create the TaskManager lazily, since no event loop is
        # running in ServerApp.initialize_settings().
        if "task_manager" not in self.settings:
            self.settings["task_manager"] = TaskManager(gai_engines=self.settings["gai_engines"])
        return self.settings["task_manager"]
    
    @tornado.web.authenticated
    async def get(self, id=None):
        if id is None:
            list_tasks_response = await self.task_manager.list_tasks()
            self.finish(json.dumps(list_tasks_response.dict()))
            return
        
        describe_task_response = await self.task_manager.describe_task(id)
        if describe_task_response is None:
            raise HTTPError(404, f"Task not found with ID: {id}")

        self.finish(json.dumps(describe_task_response.dict()))
