"""
Run this once to populate the database with realistic past scan history.
Usage: python seed_history.py
"""
import uuid
import json
from datetime import datetime, timedelta
from database import init_db, save_scan, get_conn

SEED_SCANS = [
    {
        "filename": "bert-base-uncased.bin",
        "days_ago": 14,
        "result": {
            "summary": {
                "total_issues": 1, "critical": 0, "high": 0, "medium": 1, "low": 0,
                "security_score": 91, "security_grade": "A", "verdict": "SAFE - Excellent security posture"
            },
            "results": [
                {
                    "id": "HEX-META-001", "type": "METADATA", "severity": "MEDIUM",
                    "title": "Model provenance unverified",
                    "description": "No cryptographic signature found for bert-base-uncased.bin",
                    "file_path": "/scan/bert-base-uncased.bin", "confidence": 0.85,
                    "remediation": "Sign the model using Sigstore or similar tooling", "cwe": ["CWE-345"]
                }
            ]
        }
    },
    {
        "filename": "gpt2-medium.safetensors",
        "days_ago": 10,
        "result": {
            "summary": {
                "total_issues": 3, "critical": 0, "high": 1, "medium": 2, "low": 0,
                "security_score": 78, "security_grade": "B+", "verdict": "SAFE - Good security posture"
            },
            "results": [
                {
                    "id": "HEX-PRIV-001", "type": "PRIVACY", "severity": "HIGH",
                    "title": "Potential PII memorization detected",
                    "description": "Model shows signs of memorizing training data patterns that may contain PII",
                    "file_path": "/scan/gpt2-medium.safetensors", "confidence": 0.72,
                    "remediation": "Apply differential privacy techniques during fine-tuning", "cwe": ["CWE-359"]
                },
                {
                    "id": "HEX-COMP-002", "type": "COMPLIANCE", "severity": "MEDIUM",
                    "title": "Missing model card documentation",
                    "description": "No model card found describing intended use, limitations, and training data",
                    "file_path": "/scan/gpt2-medium.safetensors", "confidence": 1.0,
                    "remediation": "Add a model card following Hugging Face model card guidelines", "cwe": ["CWE-1059"]
                },
                {
                    "id": "HEX-META-002", "type": "METADATA", "severity": "MEDIUM",
                    "title": "Outdated framework version detected",
                    "description": "Model was trained with PyTorch 1.9.0 which has known vulnerabilities",
                    "file_path": "/scan/gpt2-medium.safetensors", "confidence": 0.91,
                    "remediation": "Retrain or convert model using PyTorch 2.x", "cwe": ["CWE-1104"]
                }
            ]
        }
    },
    {
        "filename": "resnet50.onnx",
        "days_ago": 7,
        "result": {
            "summary": {
                "total_issues": 5, "critical": 1, "high": 2, "medium": 1, "low": 1,
                "security_score": 54, "security_grade": "D", "verdict": "UNSAFE - Critical issues detected"
            },
            "results": [
                {
                    "id": "HEX-VULN-001", "type": "VULNERABILITY", "severity": "CRITICAL",
                    "title": "Arbitrary code execution via unsafe operator",
                    "description": "ONNX model contains a custom operator that executes arbitrary Python code",
                    "file_path": "/scan/resnet50.onnx", "confidence": 0.97,
                    "remediation": "Remove custom operators or validate them against a whitelist",
                    "cwe": ["CWE-94"],
                    "cvss": {"version": "3.1", "base_score": 9.8, "base_severity": "CRITICAL"}
                },
                {
                    "id": "HEX-BACK-001", "type": "BACKDOOR", "severity": "HIGH",
                    "title": "Suspicious activation pattern detected",
                    "description": "Neural Cleanse analysis found anomalous neuron activations consistent with backdoor triggers",
                    "file_path": "/scan/resnet50.onnx", "confidence": 0.68,
                    "remediation": "Retrain model from scratch with verified clean dataset", "cwe": ["CWE-506"]
                },
                {
                    "id": "HEX-SUPPLY-001", "type": "SUPPLY_CHAIN", "severity": "HIGH",
                    "title": "Dependency on vulnerable numpy version",
                    "description": "Model metadata references numpy==1.21.0 which has CVE-2021-41495",
                    "file_path": "/scan/resnet50.onnx", "confidence": 1.0,
                    "remediation": "Update numpy to 1.24.0 or later", "cwe": ["CWE-1104"]
                },
                {
                    "id": "HEX-ENT-001", "type": "ENTROPY", "severity": "MEDIUM",
                    "title": "High entropy blob detected in model weights",
                    "description": "Unusual entropy distribution in layer 4 weights may indicate hidden payload",
                    "file_path": "/scan/resnet50.onnx", "confidence": 0.61,
                    "remediation": "Inspect model weights for embedded data", "cwe": ["CWE-506"]
                },
                {
                    "id": "HEX-COMP-003", "type": "COMPLIANCE", "severity": "LOW",
                    "title": "No license file detected",
                    "description": "Model lacks licensing information",
                    "file_path": "/scan/resnet50.onnx", "confidence": 1.0,
                    "remediation": "Add a LICENSE file", "cwe": ["CWE-489"]
                }
            ]
        }
    },
    {
        "filename": "distilbert-sentiment.pkl",
        "days_ago": 3,
        "result": {
            "summary": {
                "total_issues": 4, "critical": 1, "high": 1, "medium": 1, "low": 1,
                "security_score": 48, "security_grade": "F", "verdict": "UNSAFE - Critical issues detected"
            },
            "results": [
                {
                    "id": "HEX-PICK-001", "type": "VULNERABILITY", "severity": "CRITICAL",
                    "title": "Unsafe pickle deserialization",
                    "description": "Pickle file can execute arbitrary code during deserialization. This is a critical supply chain risk.",
                    "file_path": "/scan/distilbert-sentiment.pkl", "confidence": 0.99,
                    "remediation": "Convert to safetensors format immediately",
                    "cwe": ["CWE-502"],
                    "cvss": {"version": "3.1", "base_score": 9.8, "base_severity": "CRITICAL"}
                },
                {
                    "id": "HEX-LLM-001", "type": "LLM_SECURITY", "severity": "HIGH",
                    "title": "Prompt injection vulnerability",
                    "description": "Model shows susceptibility to prompt injection attacks in adversarial testing",
                    "file_path": "/scan/distilbert-sentiment.pkl", "confidence": 0.74,
                    "remediation": "Implement input sanitization and output filtering", "cwe": ["CWE-77"]
                },
                {
                    "id": "HEX-ADV-001", "type": "ADVERSARIAL", "severity": "MEDIUM",
                    "title": "Low adversarial robustness (FGSM)",
                    "description": "Model accuracy drops to 31% under FGSM attack with epsilon=0.1",
                    "file_path": "/scan/distilbert-sentiment.pkl", "confidence": 0.88,
                    "remediation": "Apply adversarial training or input preprocessing defenses", "cwe": ["CWE-693"]
                },
                {
                    "id": "HEX-META-003", "type": "METADATA", "severity": "LOW",
                    "title": "Training data source undocumented",
                    "description": "No information about training dataset provenance or data collection practices",
                    "file_path": "/scan/distilbert-sentiment.pkl", "confidence": 1.0,
                    "remediation": "Document training data sources in model card", "cwe": ["CWE-1059"]
                }
            ]
        }
    },
    {
        "filename": "stable-diffusion-v1-4.safetensors",
        "days_ago": 1,
        "result": {
            "summary": {
                "total_issues": 2, "critical": 0, "high": 1, "medium": 1, "low": 0,
                "security_score": 82, "security_grade": "B", "verdict": "SAFE - Good security posture"
            },
            "results": [
                {
                    "id": "HEX-LIC-001", "type": "LICENSE", "severity": "HIGH",
                    "title": "Restrictive CreativeML license detected",
                    "description": "Model uses CreativeML Open RAIL-M license which restricts certain commercial uses",
                    "file_path": "/scan/stable-diffusion-v1-4.safetensors", "confidence": 1.0,
                    "remediation": "Review license terms before commercial deployment", "cwe": ["CWE-489"]
                },
                {
                    "id": "HEX-PRIV-002", "type": "PRIVACY", "severity": "MEDIUM",
                    "title": "Training data may contain copyrighted content",
                    "description": "Model trained on LAION-5B dataset which may include copyrighted images",
                    "file_path": "/scan/stable-diffusion-v1-4.safetensors", "confidence": 0.79,
                    "remediation": "Consult legal team before production deployment", "cwe": ["CWE-359"]
                }
            ]
        }
    }
]


def seed():
    init_db()

    # Check if already seeded
    with get_conn() as conn:
        count = conn.execute("SELECT COUNT(*) FROM scans").fetchone()[0]
        if count > 0:
            print(f"Database already has {count} scans. Skipping seed.")
            return

    base_time = datetime.utcnow()

    for item in SEED_SCANS:
        scan_id = str(uuid.uuid4())
        scanned_at = (base_time - timedelta(days=item["days_ago"])).isoformat()
        result = item["result"]
        result["filename"] = item["filename"]
        result["scan_id"] = scan_id

        summary = result["summary"]
        with get_conn() as conn:
            conn.execute("""
                INSERT INTO scans VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                scan_id, item["filename"], scanned_at,
                summary["total_issues"], summary["critical"], summary["high"],
                summary["medium"], summary["low"], summary["security_score"],
                summary["security_grade"], summary["verdict"],
                json.dumps(result)
            ))
            conn.commit()
        print(f"Seeded: {item['filename']}")

    print("Done. 5 historical scans added.")


if __name__ == "__main__":
    seed()
