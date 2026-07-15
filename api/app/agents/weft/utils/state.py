from enum import StrEnum

from langgraph.graph import END, MessagesState
from pydantic import BaseModel, Field, computed_field, model_validator


class Stage(StrEnum):
    """The single source for stage names. Also the graph's node names, so
    `current_node` can never name a node that was not registered.

    Only ever cross into LangGraph as `.value`: anything put in state is
    msgpack'd into the checkpoint, and a custom type there is deserialized on
    a best-effort basis today and refused outright in a later version.
    """

    EXTRACT_REQUIREMENTS = "extract_requirements"
    GENERATE_TEST_CASES = "generate_test_cases"


NODE_SEQUENCE: dict[str, str] = {
    Stage.EXTRACT_REQUIREMENTS.value: Stage.GENERATE_TEST_CASES.value,
    Stage.GENERATE_TEST_CASES.value: END,
}


# --- LLM structured-output targets -------------------------------------------
# The model assigns ids as <FEATURE>-<NNN>: LOGIN-001, CART-002. They are
# provisional — real req_keys are minted at approval — but the feature prefix
# survives a re-draft, where a globally positional id would silently come back
# attached to a different requirement.

REQUIREMENT_ID = r"^[A-Z][A-Z0-9]{1,9}-\d{3}$"  # LOGIN-001
TEST_CASE_ID = r"^[A-Z][A-Z0-9]{1,9}-TC-\d{3}$"  # LOGIN-TC-001


class AcceptanceCriterion(BaseModel):
    text: str


class Requirement(BaseModel):
    id: str = Field(pattern=REQUIREMENT_ID)
    title: str
    statement: str
    acceptance_criteria: list[AcceptanceCriterion] = Field(min_length=1)


class ExtractedRequirements(BaseModel):
    requirements: list[Requirement]

    @model_validator(mode="after")
    def _ids_unique(self):
        ids = [r.id for r in self.requirements]
        if len(ids) != len(set(ids)):
            raise ValueError(f"duplicate requirement ids: {ids}")
        return self


class TestCase(BaseModel):
    __test__ = False  # a domain model, not a pytest class — stops Test* collection

    id: str = Field(pattern=TEST_CASE_ID)
    title: str
    steps: list[str] = Field(min_length=1)
    requirement_id: str = Field(pattern=REQUIREMENT_ID)
    criterion_index: int

    @computed_field
    @property
    def gherkin(self) -> str:
        """One step per line.

        The steps arrive as a list rather than a newline-joined string because
        this model cannot emit a newline inside a structured-output string
        field — verified: it does so fine in plain text, but the tool-call path
        strips them, and few-shot examples do not fix it. Letting the list carry
        the line breaks makes the format impossible to get wrong.
        """
        return "\n".join(self.steps)


class GeneratedTestCases(BaseModel):
    test_cases: list[TestCase]

    @model_validator(mode="after")
    def _ids_unique(self):
        ids = [tc.id for tc in self.test_cases]
        if len(ids) != len(set(ids)):
            raise ValueError(f"duplicate test case ids: {ids}")
        return self


class WeftState(MessagesState):
    workspace_id: str
    requirements: list[dict]
    test_cases: list[dict]
    current_node: str  # a Stage value; plain str so it round-trips the checkpoint
    feedback: str
    
