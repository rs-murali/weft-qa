from langchain_core.messages import SystemMessage


class Nodes:
    def __init__(self, llm, system_prompt: str):
        self.llm = llm
        self.system_prompt = system_prompt

    async def generate(self, state):
        messages = [SystemMessage(content=self.system_prompt)] + state["messages"]
        response = await self.llm.ainvoke(messages)
        return {"messages": [response]}
