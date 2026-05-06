"""Generates the short intro message a newly-invited LLM posts to the chat.

LangChain LCEL chain: prompt | model | str-parser. The output shape is
identical to the previous raw-OpenAI version (a string), so /inviteLLM
behavior is unchanged.
"""

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from .prompts import JOIN_PROMPT_USER


_prompt = ChatPromptTemplate.from_messages([
    ("user", JOIN_PROMPT_USER),
])
_model = ChatOpenAI(model="gpt-4o")
_chain = _prompt | _model | StrOutputParser()


def generate_join_message(display_name: str) -> str:
    return _chain.invoke(
        {"display_name": display_name},
        config={"run_name": "join_agent", "tags": ["join_agent"]},
    )
