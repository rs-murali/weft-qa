from datetime import datetime
from pathlib import Path

OUTPUT_DIR = Path("output")


def save_llm_output(node_name: str, response: str) -> Path:
    """Save the latest LLM response as a Markdown file for inspection.

    Existing file is overwritten on each run, so `output/<node_name>.md` always
    holds the most recent draft that node produced.
    """
    OUTPUT_DIR.mkdir(exist_ok=True)
    file_path = OUTPUT_DIR / f"{node_name}.md"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    content = f"""---
node: {node_name}
generated_at: {timestamp}
---

{response}
"""
    file_path.write_text(content, encoding="utf-8")
    return file_path
