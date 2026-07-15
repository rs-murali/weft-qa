import json

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.types import Command, interrupt

from app.core.prompt_loader import PromptTemplate
from app.utils.llm_output import save_llm_output

from .state import (
    NODE_SEQUENCE,
    ExtractedRequirements,
    GeneratedTestCases,
    Stage,
    TestCase,
    WeftState,
)


def _as_prompt_json(value: list[dict] | None) -> str:
    """Render a draft for a prompt placeholder. Empty when there is no draft,
    so the prompt's "if this is empty, it's a first pass" branch holds."""
    return json.dumps(value, indent=2) if value else ""


def _latest_human_text(messages: list) -> str:
    """The requirement text is whatever the user last typed. Empty when there is
    no human turn, so the prompt's "nothing extractable" branch holds.

    Read from state rather than the request, so a re-draft after a rejection
    works from the same turn the reviewer was looking at.
    """
    for message in reversed(messages):
        if isinstance(message, HumanMessage):
            return message.text
    return ""


def _with_valid_links(
    test_cases: list[TestCase], requirements: list[dict]
) -> list[TestCase]:
    """Drop test cases pointing at a requirement or criterion that does not exist.

    The requirement/criterion link is the structure everything downstream is
    built on, so a hallucinated index must never reach state.
    """
    criteria_counts = {r["id"]: len(r["acceptance_criteria"]) for r in requirements}
    return [
        tc
        for tc in test_cases
        if 0 <= tc.criterion_index < criteria_counts.get(tc.requirement_id, 0)
    ]


class Nodes:
    def __init__(
        self,
        llm,
        extract_prompt: PromptTemplate,
        test_gen_prompt: PromptTemplate,
    ):
        self.llm = llm
        self.extract_prompt = extract_prompt
        self.test_gen_prompt = test_gen_prompt

    async def extract_requirements(self, state: WeftState) -> dict:
        prompt = self.extract_prompt
        extracted = await self.llm.with_structured_output(ExtractedRequirements).ainvoke(
            [
                SystemMessage(prompt.system_prompt),
                HumanMessage(
                    prompt.user_prompt.format(
                        user_request=_latest_human_text(state["messages"]),
                        previous_draft=_as_prompt_json(state.get("requirements")),
                        feedback=state.get("feedback") or "",
                    )
                ),
            ]
        )
        save_llm_output(
            Stage.EXTRACT_REQUIREMENTS.value, extracted.model_dump_json(indent=2)
        )
        return {
            "requirements": extracted.model_dump()["requirements"],
            "current_node": Stage.EXTRACT_REQUIREMENTS.value,
            "feedback": "",
        }

    async def generate_test_cases(self, state: WeftState) -> dict:
        prompt = self.test_gen_prompt
        requirements = state["requirements"]
        generated = await self.llm.with_structured_output(GeneratedTestCases).ainvoke(
            [
                SystemMessage(prompt.system_prompt),
                HumanMessage(
                    prompt.user_prompt.format(
                        requirements=_as_prompt_json(requirements),
                        previous_draft=_as_prompt_json(state.get("test_cases")),
                        feedback=state.get("feedback") or "",
                    )
                ),
            ]
        )
        save_llm_output(
            Stage.GENERATE_TEST_CASES.value, generated.model_dump_json(indent=2)
        )
        linked = _with_valid_links(generated.test_cases, requirements)
        return {
            "test_cases": [tc.model_dump() for tc in linked],
            "current_node": Stage.GENERATE_TEST_CASES.value,
            "feedback": "",
        }

    async def human_approval(self, state: WeftState) -> Command:
        """Pause for the reviewer, then route.

        Resuming re-runs a node from the top, so this one holds nothing but the
        interrupt and the routing decision — an LLM call here would re-fire on
        every approval and hand back a draft the reviewer never saw.
        """
        current = state["current_node"]
        decision = interrupt({"stage": current})

        if decision.get("regenerate"):
            return Command(
                goto=current,
                update={"feedback": decision.get("feedback", "")},
            )
        return Command(goto=NODE_SEQUENCE[current], update={"feedback": ""})
