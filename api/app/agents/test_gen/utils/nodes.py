# from langchain_core.messages import SystemMessage


class Nodes:
    def __init__(self, llm, system_prompt: str):
        self.llm = llm
        self.system_prompt = system_prompt

    async def generate(self, state):
        """
        Temporarily bypassing the system prompt.
        To be implemented in the next step
        """
        response = await self.llm.ainvoke(state["messages"])
        return {"messages": [response]}
