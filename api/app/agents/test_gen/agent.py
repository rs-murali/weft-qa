from langgraph.graph import StateGraph, START, END
from langchain_core.messages import HumanMessage
from .utils.state import TestGenState
from .utils.nodes import Nodes


class TestGenAgent:
    def __init__(self, nodes: Nodes):
        self._graph = self._build(nodes)

    def _build(self, nodes: Nodes):
        graph = StateGraph(TestGenState)
        graph.add_node("generate", nodes.generate)
        graph.add_edge(START, "generate")
        graph.add_edge("generate", END)
        return graph.compile()

    async def astream(self, message: str):
        async for event in self._graph.astream_events(
            {"messages": [HumanMessage(content=message)]},
            version="v2",
        ):
            if event["event"] == "on_chat_model_stream":
                chunk = event["data"]["chunk"]
                if chunk.content:
                    yield chunk.content
