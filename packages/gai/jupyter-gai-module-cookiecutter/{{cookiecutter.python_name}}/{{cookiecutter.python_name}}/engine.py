from typing import List, Dict

from jupyter_gai.engine import BaseModelEngine, DefaultTaskDefinition
from jupyter_gai.models import DescribeTaskResponse

class TestModelEngine(BaseModelEngine):
    name = "test"
    input_type = "txt"
    output_type = "txt"

    # BaseModelEngine is also a traitlets.config.Configurable object, so you can
    # also expose configurable traits on the class definition like so:
    #
    # api_key = Unicode(
    #     config=True,
    #     help="OpenAI API key",
    #     allow_none=False
    # )
    #

    def list_default_tasks(self) -> List[DefaultTaskDefinition]:
        # Tasks your model engine provides by default.
        return [
            {
                "id": "test",
                "name": "Test task",
                "prompt_template": "{body}",
                "insertion_mode": "test"
            }
        ]

    async def execute(self, task: DescribeTaskResponse, prompt_variables: Dict[str, str]):
        # Core method that executes a model when provided with a task
        # description and a dictionary of prompt variables. For example, to
        # execute an OpenAI text completion model:
        #
        # prompt = task.prompt_template.format(**prompt_variables)
        # openai.api_key = self.api_key
        # response = openai.Completion.create(
        #     model="text-davinci-003",
        #     prompt=prompt,
        #     ...
        # )
        # return response['choices'][0]['text']

        return "test output"
