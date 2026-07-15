import json

import pytest
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END
from langgraph.types import Command
from pydantic import ValidationError

from app.agents.weft.agent import WeftAgent
from app.agents.weft.utils.nodes import Nodes
from app.agents.weft.utils.state import (
    NODE_SEQUENCE,
    AcceptanceCriterion,
    ExtractedRequirements,
    GeneratedTestCases,
    Requirement,
    Stage,
    TestCase,
)
from app.core.prompt_loader import PromptTemplate


@pytest.fixture(autouse=True)
def _isolate_llm_output(tmp_path, monkeypatch):
    """Nodes write their draft to output/<node>.md. Keep that out of the repo
    and off whatever directory pytest happens to run from."""
    monkeypatch.setattr("app.utils.llm_output.OUTPUT_DIR", tmp_path / "output")


# ---------------------------------------------------------------------------
# fakes
# ---------------------------------------------------------------------------


class _FakeStructuredLLM:
    def __init__(self, llm, model):
        self._llm = llm
        self._model = model

    async def ainvoke(self, messages):
        self._llm.calls.append((self._model, messages))
        return self._llm.responses[self._model]


class FakeLLM:
    """Records every structured-output call so tests can assert call counts."""

    def __init__(self, responses):
        self.responses = responses
        self.calls = []

    def with_structured_output(self, model):
        return _FakeStructuredLLM(self, model)

    def calls_for(self, model):
        return [c for c in self.calls if c[0] is model]


def _prompt(body: str) -> PromptTemplate:
    return PromptTemplate(system_prompt="sys", user_prompt=body)


def _requirements(count=2):
    return ExtractedRequirements(
        requirements=[
            Requirement(
                id=f"LOGIN-{i:03d}",
                title=f"Requirement {i}",
                statement=f"The system shall do {i}.",
                acceptance_criteria=[AcceptanceCriterion(text=f"AC for {i}")],
            )
            for i in range(1, count + 1)
        ]
    )


def _test_cases(*, requirement_id="LOGIN-001", criterion_index=0):
    return GeneratedTestCases(
        test_cases=[
            TestCase(
                id="LOGIN-TC-001",
                title="Logs in with valid credentials",
                steps=["Given a user", "When they log in", "Then they are authenticated"],
                requirement_id=requirement_id,
                criterion_index=criterion_index,
            )
        ]
    )


def _agent(llm):
    nodes = Nodes(
        llm=llm,
        extract_prompt=_prompt("{user_request}|{previous_draft}|{feedback}"),
        test_gen_prompt=_prompt("{requirements}|{previous_draft}|{feedback}"),
    )
    return WeftAgent(nodes=nodes, checkpointer=InMemorySaver())


def _fresh_llm(test_cases=None):
    return FakeLLM(
        {
            ExtractedRequirements: _requirements(),
            GeneratedTestCases: test_cases or _test_cases(),
        }
    )


SOURCE_TEXT = "Users must log in with email and password."


def _start():
    return {
        "workspace_id": "ws-1",
        "requirements": [],
        "test_cases": [],
        "feedback": "",
        "messages": [HumanMessage(SOURCE_TEXT)],
    }


APPROVE = Command(resume={"regenerate": False})


def _reject(feedback):
    return Command(resume={"regenerate": True, "feedback": feedback})


# ---------------------------------------------------------------------------
# schema guards
# ---------------------------------------------------------------------------


def test_duplicate_requirement_ids_rejected():
    """The model assigns ids now. `_with_valid_links` keys a dict on them, so a
    collision would silently collapse two requirements into one and mislink
    every test case pointing at the loser."""
    with pytest.raises(ValidationError, match="duplicate requirement ids"):
        ExtractedRequirements(
            requirements=[
                Requirement(
                    id="LOGIN-001",
                    title="First",
                    statement="s",
                    acceptance_criteria=[AcceptanceCriterion(text="a")],
                ),
                Requirement(
                    id="LOGIN-001",
                    title="Second",
                    statement="s",
                    acceptance_criteria=[AcceptanceCriterion(text="a")],
                ),
            ]
        )


def test_duplicate_test_case_ids_rejected():
    with pytest.raises(ValidationError, match="duplicate test case ids"):
        GeneratedTestCases(
            test_cases=[
                TestCase(
                    id="LOGIN-TC-001",
                    title="First",
                    steps=["Given a", "When b", "Then c"],
                    requirement_id="LOGIN-001",
                    criterion_index=0,
                ),
                TestCase(
                    id="LOGIN-TC-001",
                    title="Second",
                    steps=["Given a", "When b", "Then c"],
                    requirement_id="LOGIN-001",
                    criterion_index=0,
                ),
            ]
        )


def test_requirement_needs_at_least_one_criterion():
    with pytest.raises(ValidationError):
        Requirement(id="LOGIN-001", title="t", statement="s", acceptance_criteria=[])


@pytest.mark.parametrize(
    "bad_id",
    ["tmp-1", "REQ_001", "login-001", "LOGIN-1", "LOGIN-0001", "LOGIN001", "L-001"],
)
def test_requirement_id_must_be_feature_scoped(bad_id):
    """Ids are <FEATURE>-<NNN> (LOGIN-001). A free-tier model will drift back to
    positional or lowercase ids, and a malformed id silently breaks the link
    test cases resolve against."""
    with pytest.raises(ValidationError):
        Requirement(
            id=bad_id,
            title="t",
            statement="s",
            acceptance_criteria=[AcceptanceCriterion(text="a")],
        )


@pytest.mark.parametrize("bad_id", ["LOGIN-001", "TC-001", "tmp-tc-1", "LOGIN-TC-1"])
def test_test_case_id_must_carry_feature_and_tc(bad_id):
    with pytest.raises(ValidationError):
        TestCase(
            id=bad_id,
            title="t",
            steps=["Given a"],
            requirement_id="LOGIN-001",
            criterion_index=0,
        )


def test_gherkin_is_joined_from_steps():
    """The model cannot emit newlines inside a structured-output string field
    (verified against the live model), so `steps` is a list and the newlines
    come from the join. `gherkin` must survive model_dump for the frontend."""
    tc = TestCase(
        id="LOGIN-TC-001",
        title="t",
        steps=["Given a user", "When they log in", "Then they are authenticated"],
        requirement_id="LOGIN-001",
        criterion_index=0,
    )

    assert tc.gherkin == "Given a user\nWhen they log in\nThen they are authenticated"
    assert tc.model_dump()["gherkin"] == tc.gherkin


def test_llm_is_never_asked_for_gherkin():
    """gherkin is computed, so it must not appear in the schema the model fills
    — that is the whole point of moving to `steps`."""
    fillable = TestCase.model_json_schema(mode="validation")["properties"]

    assert "steps" in fillable
    assert "gherkin" not in fillable


# ---------------------------------------------------------------------------
# wiring
# ---------------------------------------------------------------------------


def test_node_sequence_only_names_registered_nodes():
    """human_approval routes with `goto=current_node` and `goto=NODE_SEQUENCE[...]`,
    so every stage and target must be a node the graph actually registered.
    Without this, a rename fails at runtime instead of here."""
    registered = set(_agent(_fresh_llm())._graph.get_graph().nodes)

    for stage, next_node in NODE_SEQUENCE.items():
        assert stage in registered, f"{stage} is not a registered node"
        assert next_node == END or next_node in registered, (
            f"{stage} routes to unregistered {next_node}"
        )


# ---------------------------------------------------------------------------
# gate 1
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_pauses_at_requirements_gate():
    agent = _agent(_fresh_llm())
    await agent.ainvoke("t1", _start())

    pending = await agent.get_pending_interrupt("t1")
    assert pending == {"stage": Stage.EXTRACT_REQUIREMENTS}


@pytest.mark.asyncio
async def test_extract_assigns_sequential_ids():
    agent = _agent(_fresh_llm())
    state = await agent.ainvoke("t1", _start())

    assert [r["id"] for r in state["requirements"]] == ["LOGIN-001", "LOGIN-002"]


@pytest.mark.asyncio
async def test_extract_reads_the_latest_human_message():
    """There is no source_text — the requirement text is whatever the user
    typed, so the node has to pull it off the message history."""
    llm = _fresh_llm()
    agent = _agent(llm)
    await agent.ainvoke("t1", _start())

    _, messages = llm.calls_for(ExtractedRequirements)[0]
    assert SOURCE_TEXT in messages[1].content


@pytest.mark.asyncio
async def test_extract_ignores_earlier_turns():
    llm = _fresh_llm()
    agent = _agent(llm)
    await agent.ainvoke(
        "t1",
        _start() | {"messages": [HumanMessage("an older, stale request"), HumanMessage(SOURCE_TEXT)]},
    )

    _, messages = llm.calls_for(ExtractedRequirements)[0]
    assert SOURCE_TEXT in messages[1].content
    assert "stale" not in messages[1].content


@pytest.mark.asyncio
async def test_reject_reruns_extract_with_feedback_in_prompt():
    llm = _fresh_llm()
    agent = _agent(llm)
    await agent.ainvoke("t1", _start())
    await agent.ainvoke("t1", _reject("also lock the account after 5 failed attempts"))

    extract_calls = llm.calls_for(ExtractedRequirements)
    assert len(extract_calls) == 2

    _, messages = extract_calls[1]
    rendered = messages[1].content
    assert "also lock the account after 5 failed attempts" in rendered
    assert "LOGIN-001" in rendered  # previous draft was passed back in
    # The reason arrives out-of-band, so the re-draft still works from the same
    # human turn the reviewer was looking at.
    assert SOURCE_TEXT in rendered


@pytest.mark.asyncio
async def test_approve_advances_to_test_cases_gate():
    agent = _agent(_fresh_llm())
    await agent.ainvoke("t1", _start())
    await agent.ainvoke("t1", APPROVE)

    pending = await agent.get_pending_interrupt("t1")
    assert pending == {"stage": Stage.GENERATE_TEST_CASES}


# ---------------------------------------------------------------------------
# gate 2
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_reject_at_gate_two_reruns_generate_not_extract():
    llm = _fresh_llm()
    agent = _agent(llm)
    await agent.ainvoke("t1", _start())
    await agent.ainvoke("t1", APPROVE)
    await agent.ainvoke("t1", _reject("cover the lockout boundary"))

    assert len(llm.calls_for(GeneratedTestCases)) == 2
    assert len(llm.calls_for(ExtractedRequirements)) == 1  # never went back to stage 1

    pending = await agent.get_pending_interrupt("t1")
    assert pending == {"stage": Stage.GENERATE_TEST_CASES}


@pytest.mark.asyncio
async def test_approve_at_gate_two_reaches_end():
    agent = _agent(_fresh_llm())
    await agent.ainvoke("t1", _start())
    await agent.ainvoke("t1", APPROVE)
    state = await agent.ainvoke("t1", APPROVE)

    assert await agent.get_pending_interrupt("t1") is None
    assert [tc["id"] for tc in state["test_cases"]] == ["LOGIN-TC-001"]


# ---------------------------------------------------------------------------
# the interrupt re-execution gotcha
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_llm_called_once_per_draft():
    """Resuming re-runs the node the interrupt lives in. If the approval node
    ever gains an LLM call, this catches it — the graph would still work, but
    every approval would silently re-draft."""
    llm = _fresh_llm()
    agent = _agent(llm)
    await agent.ainvoke("t1", _start())
    await agent.ainvoke("t1", APPROVE)
    await agent.ainvoke("t1", APPROVE)

    assert len(llm.calls_for(ExtractedRequirements)) == 1
    assert len(llm.calls_for(GeneratedTestCases)) == 1


# ---------------------------------------------------------------------------
# saved output
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_each_llm_node_saves_its_draft(tmp_path):
    agent = _agent(_fresh_llm())
    await agent.ainvoke("t1", _start())
    await agent.ainvoke("t1", APPROVE)

    output = tmp_path / "output"
    assert (output / "extract_requirements.md").exists()
    assert (output / "generate_test_cases.md").exists()

    saved = (output / "extract_requirements.md").read_text(encoding="utf-8")
    assert "LOGIN-001" in saved  # the ids the node assigned, not just raw LLM output


# ---------------------------------------------------------------------------
# link validation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_out_of_range_criterion_index_is_dropped():
    llm = _fresh_llm(test_cases=_test_cases(criterion_index=7))
    agent = _agent(llm)
    await agent.ainvoke("t1", _start())
    state = await agent.ainvoke("t1", APPROVE)

    assert state["test_cases"] == []


@pytest.mark.asyncio
async def test_unknown_requirement_id_is_dropped():
    llm = _fresh_llm(test_cases=_test_cases(requirement_id="LOGIN-999"))
    agent = _agent(llm)
    await agent.ainvoke("t1", _start())
    state = await agent.ainvoke("t1", APPROVE)

    assert state["test_cases"] == []


# ---------------------------------------------------------------------------
# astream
# ---------------------------------------------------------------------------


async def _events(agent, thread_id, payload) -> list[dict]:
    """Every NDJSON line the run emitted, parsed back. Asserting on the parsed
    events rather than the raw text keeps these tests off the framing."""
    return [
        json.loads(line) async for line in agent.astream(thread_id, payload)
    ]


def _types(events):
    return [e["type"] for e in events]


@pytest.mark.asyncio
async def test_stream_emits_requirements_then_stops_at_the_gate():
    agent = _agent(_fresh_llm())
    events = await _events(agent, "t1", _start())

    assert _types(events) == ["requirements", "interrupt"]
    assert [r["id"] for r in events[0]["requirements"]] == ["LOGIN-001", "LOGIN-002"]
    assert events[1]["stage"] == Stage.EXTRACT_REQUIREMENTS


@pytest.mark.asyncio
async def test_stream_does_not_report_done_while_a_gate_is_open():
    """`done` is how the client tells a finished run from a paused one, and the
    generator ends either way — so a pause must not emit it."""
    agent = _agent(_fresh_llm())
    events = await _events(agent, "t1", _start())

    assert "done" not in _types(events)


@pytest.mark.asyncio
async def test_stream_approve_advances_to_the_second_gate():
    agent = _agent(_fresh_llm())
    await _events(agent, "t1", _start())
    events = await _events(agent, "t1", APPROVE)

    assert _types(events) == ["test_cases", "interrupt"]
    assert [tc["id"] for tc in events[0]["test_cases"]] == ["LOGIN-TC-001"]
    assert events[1]["stage"] == Stage.GENERATE_TEST_CASES


@pytest.mark.asyncio
async def test_stream_reports_done_once_the_graph_finishes():
    agent = _agent(_fresh_llm())
    await _events(agent, "t1", _start())
    await _events(agent, "t1", APPROVE)
    events = await _events(agent, "t1", APPROVE)

    assert _types(events) == ["done"]
    assert await agent.get_pending_interrupt("t1") is None


@pytest.mark.asyncio
async def test_stream_reject_redrafts_and_reopens_the_same_gate():
    agent = _agent(_fresh_llm())
    await _events(agent, "t1", _start())
    events = await _events(agent, "t1", _reject("split the login requirement"))

    assert _types(events) == ["requirements", "interrupt"]
    assert events[1]["stage"] == Stage.EXTRACT_REQUIREMENTS


@pytest.mark.asyncio
async def test_stream_reports_a_node_failure_as_an_error_event_instead_of_raising():
    """A node exception must not reach the caller uncaught: by the time
    `agent.astream` is wired into `StreamingResponse`, the 200 and chunked
    headers are already on the wire, so an unhandled raise here would abort
    the connection mid-stream instead of ending it — that is what
    `ERR_INCOMPLETE_CHUNKED_ENCODING` on the client comes from."""

    class _Boom:
        def with_structured_output(self, model):
            class _Raiser:
                async def ainvoke(self, messages):
                    raise ValueError("upstream LLM error")

            return _Raiser()

    agent = _agent(_Boom())
    events = await _events(agent, "t1", _start())

    assert _types(events) == ["error"]
    assert "upstream LLM error" in events[0]["message"]
    # current_node is only written by a node's successful return, so a
    # first-run failure has none recorded yet — the wire type already
    # accounts for this (`stage: WeftStage | null`).
    assert events[0]["stage"] is None


@pytest.mark.asyncio
async def test_stream_never_leaks_the_approval_nodes_feedback_write():
    """human_approval returns a Command, so stream_mode="updates" reports its
    `feedback` write too. It says nothing a client can use, and shipping it
    would put a bare {"feedback": ""} on the wire with no `type`."""
    agent = _agent(_fresh_llm())
    await _events(agent, "t1", _start())
    events = await _events(agent, "t1", APPROVE)

    assert all(e["type"] in {"requirements", "test_cases", "interrupt", "done"} for e in events)
    assert all("feedback" not in e for e in events)
