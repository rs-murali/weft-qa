import json

from langgraph.graph import START, StateGraph
from langgraph.types import Command

from .utils.nodes import Nodes
from .utils.state import Stage, WeftState

HUMAN_APPROVAL = "human_approval"
INTERRUPT = "__interrupt__"


def event_line(payload: dict) -> str:
    """One NDJSON line — the wire format for everything this agent streams.

    The nodes produce structured output, not tokens, so the wire carries whole
    drafts rather than a text stream. Public because the router frames its own
    error events the same way.
    """
    return json.dumps(payload) + "\n"


class WeftAgent:
    def __init__(self, nodes: Nodes, checkpointer):
        self._graph = self._build(nodes, checkpointer)

    def _build(self, nodes: Nodes, checkpointer):
        graph = StateGraph(WeftState)
        graph.add_node(Stage.EXTRACT_REQUIREMENTS.value, nodes.extract_requirements)
        graph.add_node(Stage.GENERATE_TEST_CASES.value, nodes.generate_test_cases)
        graph.add_node(HUMAN_APPROVAL, nodes.human_approval)

        graph.add_edge(START, Stage.EXTRACT_REQUIREMENTS.value)
        graph.add_edge(Stage.EXTRACT_REQUIREMENTS.value, HUMAN_APPROVAL)
        graph.add_edge(Stage.GENERATE_TEST_CASES.value, HUMAN_APPROVAL)

        return graph.compile(checkpointer=checkpointer)

    @staticmethod
    def _config(thread_id: str) -> dict:
        return {"configurable": {"thread_id": thread_id}}

    async def ainvoke(self, thread_id: str, payload: dict | Command) -> dict:
        """Start a run with a dict, or continue a paused one with
        Command(resume=...). The input type is what distinguishes them."""
        return await self._graph.ainvoke(payload, config=self._config(thread_id))

    async def astream(self, thread_id: str, payload: dict | Command):
        """The same start-or-resume payload as `ainvoke`, streamed as NDJSON.

        Only the two LLM nodes and the interrupt reach the wire: `human_approval`
        returns a Command, and `stream_mode="updates"` reports its `feedback`
        write too, which says nothing a client can use.

        A `done` event means the graph reached END. When it pauses instead, the
        `interrupt` event is the last one out — that difference is how the client
        knows whether to render a gate.

        A node exception (a malformed structured-output draft, an upstream LLM
        error) must not reach `StreamingResponse` uncaught: the 200 and chunked
        headers are already on the wire by then, so an unhandled raise here
        would abort the connection instead of ending the stream, which is what
        turns into `ERR_INCOMPLETE_CHUNKED_ENCODING` on the client. Report it as
        a normal `error` event instead.
        """
        try:
            async for chunk in self._graph.astream(
                payload, config=self._config(thread_id), stream_mode="updates"
            ):
                for node, update in chunk.items():
                    if node == INTERRUPT:
                        yield event_line({"type": "interrupt", **update[0].value})
                    elif node == Stage.EXTRACT_REQUIREMENTS.value:
                        yield event_line(
                            {"type": "requirements", "requirements": update["requirements"]}
                        )
                    elif node == Stage.GENERATE_TEST_CASES.value:
                        yield event_line(
                            {"type": "test_cases", "test_cases": update["test_cases"]}
                        )
        except Exception as exc:
            snapshot = await self._graph.aget_state(self._config(thread_id))
            stage = snapshot.values.get("current_node")
            yield event_line({"type": "error", "message": str(exc), "stage": stage})
            return

        if await self.get_pending_interrupt(thread_id) is None:
            yield event_line({"type": "done"})

    async def get_pending_interrupt(self, thread_id: str) -> dict | None:
        """The open gate's payload, or None when the graph is not paused."""
        snapshot = await self._graph.aget_state(self._config(thread_id))
        if not snapshot.interrupts:
            return None
        return snapshot.interrupts[0].value
