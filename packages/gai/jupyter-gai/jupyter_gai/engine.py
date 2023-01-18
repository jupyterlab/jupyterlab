from abc import abstractmethod, ABC, ABCMeta
from typing import Dict, TypedDict, Literal, List
import openai
from traitlets.config import LoggingConfigurable, Unicode
from .task_manager import DescribeTaskResponse

class DefaultTaskDefinition(TypedDict):
    id: str
    name: str
    prompt_template: str
    insertion_mode: str

class BaseModelEngineMetaclass(ABCMeta, type(LoggingConfigurable)):
    pass

class BaseModelEngine(ABC, LoggingConfigurable, metaclass=BaseModelEngineMetaclass):
    name: str
    input_type: str
    output_type: str
  
    @abstractmethod
    def list_default_tasks(self) -> List[DefaultTaskDefinition]:
        pass

    @abstractmethod
    async def execute(self, task: DescribeTaskResponse, prompt_variables: Dict[str, str]):
        pass

class GPT3ModelEngine(BaseModelEngine):
    name = "gpt3"
    input_type = "txt"
    output_type = "txt"

    api_key = Unicode(
        config=True,
        help="OpenAI API key",
        allow_none=False
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def list_default_tasks(self) -> List[DefaultTaskDefinition]:
        return [
            {
                "id": "explain-code",
                "name": "Explain code",
                "prompt_template": "Explain the following Python 3 code. The first sentence must begin with the phrase \"The code below\".\n{body}",
                "insertion_mode": "above"
            },
            {
                "id": "generate-code",
                "name": "Generate code",
                "prompt_template": "Generate Python 3 code in Markdown according to the following definition.\n{body}",
                "insertion_mode": "below"
            },
            {
                "id": "explain-code-in-cells-above",
                "name": "Explain code in cells above",
                "prompt_template": "Explain the following Python 3 code. The first sentence must begin with the phrase \"The code below\".\n{body}",
                "insertion_mode": "above-in-cells"
            },
            {
                "id": "generate-code-in-cells-below",
                "name": "Generate code in cells below",
                "prompt_template": "Generate Python 3 code in Markdown according to the following definition.\n{body}",
                "insertion_mode": "below-in-cells"
            },
            {
                "id": "freeform",
                "name": "Freeform prompt",
                "prompt_template": "{body}",
                "insertion_mode": "below"
            }
        ]

    async def execute(self, task: DescribeTaskResponse, prompt_variables: Dict[str, str]):
        if "body" not in prompt_variables:
            raise Exception("Prompt body must be specified.")

        prompt = task.prompt_template.format(**prompt_variables)
        self.log.info(f"GPT3 prompt:\n{prompt}")
        
        openai.api_key = self.api_key
        response = await openai.Completion.acreate(
            model="text-davinci-003",
            prompt=prompt,
            temperature=0.7,
            max_tokens=256,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0
        )
        return response['choices'][0]['text']