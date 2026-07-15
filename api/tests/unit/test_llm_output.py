import pytest

from app.utils import llm_output
from app.utils.llm_output import save_llm_output


@pytest.fixture(autouse=True)
def _tmp_output(tmp_path, monkeypatch):
    monkeypatch.setattr(llm_output, "OUTPUT_DIR", tmp_path / "output")


def test_writes_markdown_with_front_matter():
    path = save_llm_output("extract_requirements", '{"requirements": []}')

    assert path.name == "extract_requirements.md"
    content = path.read_text(encoding="utf-8")
    assert content.startswith("---\nnode: extract_requirements\n")
    assert "generated_at:" in content
    assert '{"requirements": []}' in content


def test_creates_output_dir_when_missing():
    assert not llm_output.OUTPUT_DIR.exists()

    save_llm_output("extract_requirements", "x")

    assert llm_output.OUTPUT_DIR.is_dir()


def test_overwrites_previous_run():
    save_llm_output("extract_requirements", "first draft")
    path = save_llm_output("extract_requirements", "second draft")

    content = path.read_text(encoding="utf-8")
    assert "second draft" in content
    assert "first draft" not in content


def test_each_node_gets_its_own_file():
    a = save_llm_output("extract_requirements", "reqs")
    b = save_llm_output("generate_test_cases", "tcs")

    assert a != b
    assert "reqs" in a.read_text(encoding="utf-8")
    assert "tcs" in b.read_text(encoding="utf-8")
