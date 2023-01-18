from typing import List, Dict
from traitlets.config import Unicode
import openai

from jupyter_gai.engine import BaseModelEngine, DefaultTaskDefinition
from jupyter_gai.models import DescribeTaskResponse

class DalleModelEngine(BaseModelEngine):
    name = "dalle"
    input_type = "txt"
    output_type = "img"

    api_key = Unicode(
        config=True,
        help="OpenAI API key",
        allow_none=False
    )

    def list_default_tasks(self) -> List[DefaultTaskDefinition]:
        return [
            {
                "id": "generate-image",
                "name": "Generate image below",
                "prompt_template": "{body}",
                "insertion_mode": "below-in-image"
            },
            {
                "id": "generate-photorealistic-image",
                "name": "Generate photorealistic image below",
                "prompt_template": "{body} in a photorealistic style",
                "insertion_mode": "below-in-image"
            },
            {
                "id": "generate-cartoon-image",
                "name": "Generate cartoon image below",
                "prompt_template": "{body} in the style of a cartoon",
                "insertion_mode": "below-in-image"
            }
        ]

    async def execute(self, task: DescribeTaskResponse, prompt_variables: Dict[str, str]) -> str:
        if "body" not in prompt_variables:
            raise Exception("Prompt body must be specified.")

        prompt = task.prompt_template.format(**prompt_variables)
        self.log.info(f"DALL-E prompt:\n{prompt}")

        openai.api_key = self.api_key
        response = await openai.Image.acreate(
            prompt=prompt,
            n=1,
            size="512x512"
        )

        return response['data'][0]['url']
