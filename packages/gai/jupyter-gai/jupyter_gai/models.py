from pydantic import BaseModel
from typing import Dict, List

class PromptRequest(BaseModel):
    task_id: str
    prompt_variables: Dict[str, str]

class ListTasksEntry(BaseModel):
    id: str
    name: str
    engine: str

class ListTasksResponse(BaseModel):
    tasks: List[ListTasksEntry]

class DescribeTaskResponse(BaseModel):
    name: str
    engine: str
    insertion_mode: str
    prompt_template: str
