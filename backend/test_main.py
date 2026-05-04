import json
import os
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app

client = TestClient(app)

# ── Basic API tests ──────────────────────────────────────────────────────────

def test_root():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "Hex Scanner API running"


def test_demo_scan_returns_summary():
    res = client.post("/scan/demo")
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "results" in data
    assert "filename" in data


def test_demo_scan_summary_fields():
    res = client.post("/scan/demo")
    summary = res.json()["summary"]
    for field in ["total_issues", "critical", "high", "medium", "low"]:
        assert field in summary, f"Missing field: {field}"


def test_demo_scan_results_is_list():
    res = client.post("/scan/demo")
    assert isinstance(res.json()["results"], list)


def test_scan_no_file_returns_422():
    res = client.post("/scan")
    assert res.status_code == 422


# ── Scan with mocked Docker ──────────────────────────────────────────────────

MOCK_SCAN_OUTPUT = json.dumps({
    "summary": {
        "total_issues": 1,
        "critical": 0,
        "high": 1,
        "medium": 0,
        "low": 0,
        "security_score": 80,
        "security_grade": "B",
        "verdict": "SAFE"
    },
    "results": [
        {
            "id": "HEX-TEST-001",
            "type": "COMPLIANCE",
            "severity": "HIGH",
            "title": "Test finding",
            "description": "Test description",
            "file_path": "/scan/test.pkl",
            "confidence": 0.9
        }
    ]
})


def test_scan_file_success():
    mock_result = MagicMock()
    mock_result.returncode = 0
    mock_result.stdout = MOCK_SCAN_OUTPUT
    mock_result.stderr = ""

    with patch("main.subprocess.run", return_value=mock_result):
        res = client.post(
            "/scan",
            files={"file": ("test_model.pkl", b"fake model content", "application/octet-stream")}
        )
    assert res.status_code == 200
    data = res.json()
    assert data["filename"] == "test_model.pkl"
    assert data["summary"]["total_issues"] == 1


def test_scan_file_returns_findings():
    mock_result = MagicMock()
    mock_result.returncode = 0
    mock_result.stdout = MOCK_SCAN_OUTPUT
    mock_result.stderr = ""

    with patch("main.subprocess.run", return_value=mock_result):
        res = client.post(
            "/scan",
            files={"file": ("model.safetensors", b"data", "application/octet-stream")}
        )
    findings = res.json()["results"]
    assert len(findings) == 1
    assert findings[0]["severity"] == "HIGH"


def test_scan_docker_failure_returns_500():
    mock_result = MagicMock()
    mock_result.returncode = 1
    mock_result.stdout = ""
    mock_result.stderr = "Docker error"

    with patch("main.subprocess.run", return_value=mock_result):
        res = client.post(
            "/scan",
            files={"file": ("model.pkl", b"data", "application/octet-stream")}
        )
    assert res.status_code == 500


def test_scan_invalid_json_returns_500():
    mock_result = MagicMock()
    mock_result.returncode = 0
    mock_result.stdout = "not valid json at all"
    mock_result.stderr = ""

    with patch("main.subprocess.run", return_value=mock_result):
        res = client.post(
            "/scan",
            files={"file": ("model.pkl", b"data", "application/octet-stream")}
        )
    assert res.status_code == 500
