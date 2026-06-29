from langgraph.graph import StateGraph, START, END
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

    async def astream(self, messages: list):
        async for msg, _ in self._graph.astream(
            {"messages": messages},
            stream_mode="messages",
        ):
            if msg.content:
                yield msg.content
