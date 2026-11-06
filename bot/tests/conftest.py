import json
from pathlib import Path

import pytest

FIXTURE = Path(__file__).parent / "fixtures" / "course.json"


@pytest.fixture
def course_path() -> Path:
    return FIXTURE


@pytest.fixture
def course() -> dict:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))
