import os
import json
import uuid
import shutil
import subprocess
import tempfile
import asyncio
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, WebSocket, WebSocketDisconnect, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from database import init_db, save_scan, get_all_scans, get_scan_by_id, delete_scan, get_scan_stats
from auth import (
    init_users_table, verify_password, get_user,
    create_access_token, get_current_user, require_admin,
    get_all_users, delete_user, update_user_role, create_user
)
from webhooks import init_webhooks_table, get_webhooks, add_webhook, update_webhook, delete_webhook, fire_webhooks
from apikeys import init_apikeys_table, create_api_key, get_user_api_keys, validate_api_key, delete_api_key, toggle_api_key, get_all_api_keys
from registry import init_registry_table, register_model, get_all_models, get_model_versions, delete_model_version, get_model_trend

app = FastAPI(title="Hex Scanner API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()
init_users_table()
init_webhooks_table()
init_apikeys_table()
init_registry_table()


def get_current_user_or_apikey(
    authorization: str = Header(default=None),
    x_api_key: str = Header(default=None)
):
    """Auth via JWT token OR API key"""
    # Try API key first
    if x_api_key:
        username = validate_api_key(x_api_key)
        if username:
            from auth import get_user
            user = get_user(username)
            if user:
                return user
        raise HTTPException(status_code=401, detail="Invalid API key")
    # Fall back to JWT
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        from auth import SECRET_KEY, ALGORITHM
        from jose import jwt, JWTError
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            if username:
                from auth import get_user
                user = get_user(username)
                if user:
                    return user
        except JWTError:
            pass
    raise HTTPException(status_code=401, detail="Not authenticated")


@app.get("/")
def root():
    return {"status": "Hex Scanner API running"}


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    token = create_access_token({"sub": user["username"]})
    return {"access_token": token, "token_type": "bearer", "username": user["username"], "role": user["role"]}


@app.get("/auth/me")
def me(current_user=Depends(get_current_user)):
    return {"username": current_user["username"], "role": current_user["role"]}


@app.post("/auth/register")
def register(form_data: OAuth2PasswordRequestForm = Depends(), current_user=Depends(require_admin)):
    if get_user(form_data.username):
        raise HTTPException(status_code=400, detail="Username already exists")
    create_user(form_data.username, form_data.password)
    return {"status": "created", "username": form_data.username}


# ── Admin ─────────────────────────────────────────────────────────────────────

@app.get("/admin/users")
def list_users(current_user=Depends(require_admin)):
    return get_all_users()


@app.delete("/admin/users/{username}")
def remove_user(username: str, current_user=Depends(require_admin)):
    if username == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete admin user")
    delete_user(username)
    return {"status": "deleted"}


@app.put("/admin/users/{username}/role")
def change_role(username: str, role: str, current_user=Depends(require_admin)):
    if role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'user'")
    update_user_role(username, role)
    return {"status": "updated"}


@app.get("/admin/stats")
def admin_stats(current_user=Depends(require_admin)):
    return get_scan_stats()


# ── Scan ──────────────────────────────────────────────────────────────────────

@app.post("/scan")
async def scan_file(file: UploadFile = File(...), current_user=Depends(get_current_user)):
    tmp_dir = tempfile.mkdtemp()
    file_path = os.path.join(tmp_dir, file.filename)
    try:
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        result = subprocess.run(
            ["docker", "run", "--rm", "-v", f"{tmp_dir}:/scan:ro", "layerd/hex:latest", "/scan", "--json"],
            capture_output=True, text=True, timeout=300
        )
        if result.returncode != 0 and not result.stdout.strip():
            raise HTTPException(status_code=500, detail=result.stderr)
        output = result.stdout.strip()
        json_start = output.find("{")
        if json_start == -1:
            raise HTTPException(status_code=500, detail="No JSON output from scanner")
        scan_result = json.loads(output[json_start:])
        scan_result["filename"] = file.filename
        scan_result["scanned_by"] = current_user["username"]
        scan_id = str(uuid.uuid4())
        scan_result["scan_id"] = scan_id
        save_scan(scan_id, file.filename, scan_result)
        fire_webhooks(scan_result)
        return scan_result
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Scan timed out")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse scanner output")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


@app.websocket("/ws/scan")
async def websocket_scan(websocket: WebSocket):
    await websocket.accept()
    tmp_dir = None
    try:
        # Receive file metadata
        meta = await websocket.receive_json()
        filename = meta.get("filename", "model")
        token = meta.get("token")

        # Validate token
        from jose import jwt, JWTError
        from auth import SECRET_KEY, ALGORITHM
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            if not username:
                await websocket.send_json({"type": "error", "message": "Unauthorized"})
                return
        except JWTError:
            await websocket.send_json({"type": "error", "message": "Invalid token"})
            return

        # Receive file bytes
        await websocket.send_json({"type": "status", "message": "Receiving file..."})
        file_data = await websocket.receive_bytes()

        tmp_dir = tempfile.mkdtemp()
        file_path = os.path.join(tmp_dir, filename)
        with open(file_path, "wb") as f:
            f.write(file_data)

        await websocket.send_json({"type": "status", "message": f"File received: {filename} ({len(file_data):,} bytes)"})
        await websocket.send_json({"type": "status", "message": "Starting Hex scanner..."})

        # Run Docker in a thread to avoid blocking + Windows compat
        import threading
        import queue

        msg_queue = queue.Queue()

        def run_docker():
            try:
                proc = subprocess.Popen(
                    ["docker", "run", "--rm", "-v", f"{tmp_dir}:/scan:ro",
                     "layerd/hex:latest", "/scan", "--json"],
                    stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                    text=True, bufsize=1
                )
                # Collect stderr in a separate thread
                import threading as _threading
                stderr_lines = []
                def read_stderr():
                    for line in proc.stderr:
                        line = line.strip()
                        if line:
                            stderr_lines.append(line)
                            msg_queue.put(("log", line))
                t = _threading.Thread(target=read_stderr, daemon=True)
                t.start()
                stdout_data, _ = proc.communicate()
                t.join(timeout=5)
                msg_queue.put(("stdout", stdout_data))
            except Exception as e:
                msg_queue.put(("error", str(e)))
            finally:
                msg_queue.put(("done", None))

        thread = threading.Thread(target=run_docker, daemon=True)
        thread.start()

        stdout_data = ""
        heartbeat = 0
        while True:
            try:
                msg_type, msg_data = msg_queue.get(timeout=0.1)
            except queue.Empty:
                await asyncio.sleep(0.05)
                heartbeat += 1
                if heartbeat % 40 == 0:  # every ~2 seconds
                    await websocket.send_json({"type": "log", "message": "Scanner running..."})
                continue

            if msg_type == "log":
                await websocket.send_json({"type": "log", "message": msg_data})
            elif msg_type == "stdout":
                stdout_data = msg_data
            elif msg_type == "error":
                await websocket.send_json({"type": "error", "message": msg_data})
                return
            elif msg_type == "done":
                break

        await websocket.send_json({"type": "status", "message": "Parsing results..."})

        json_start = stdout_data.find("{")
        if json_start == -1:
            await websocket.send_json({"type": "error", "message": "No JSON output from scanner"})
            return

        scan_result = json.loads(stdout_data[json_start:])
        scan_result["filename"] = filename
        scan_result["scanned_by"] = username
        scan_id = str(uuid.uuid4())
        scan_result["scan_id"] = scan_id
        save_scan(scan_id, filename, scan_result)

        await websocket.send_json({"type": "complete", "result": scan_result})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        if tmp_dir:
            shutil.rmtree(tmp_dir, ignore_errors=True)


@app.post("/scan/demo")
def scan_demo(current_user=Depends(get_current_user)):
    possible_paths = [
        os.path.join(os.path.dirname(__file__), "..", "report.json"),
        os.path.join(os.path.dirname(__file__), "report.json"),
        "report.json"
    ]
    demo_path = next((p for p in possible_paths if os.path.exists(p)), None)
    if not demo_path:
        data = {
            "summary": {
                "total_issues": 2, "critical": 0, "high": 1, "medium": 0, "low": 0,
                "security_score": 85, "security_grade": "A-", "verdict": "SAFE - Excellent security posture"
            },
            "results": [{
                "id": "HEX-DEMO-001", "type": "COMPLIANCE", "severity": "HIGH",
                "title": "No license file detected",
                "description": "Project lacks a license file",
                "file_path": "/scan", "confidence": 1,
                "remediation": "Add a LICENSE file", "cwe": ["CWE-489"]
            }]
        }
    else:
        with open(demo_path) as f:
            data = json.load(f)
    data["filename"] = "demo_model.safetensors"
    data["scanned_by"] = current_user["username"]
    scan_id = str(uuid.uuid4())
    data["scan_id"] = scan_id
    save_scan(scan_id, data["filename"], data)
    fire_webhooks(data)
    return data


# ── History ───────────────────────────────────────────────────────────────────

@app.get("/history")
def get_history(current_user=Depends(get_current_user)):
    is_admin = current_user.get("role") == "admin"
    return get_all_scans(username=current_user["username"], is_admin=is_admin)


@app.get("/history/{scan_id}")
def get_scan(scan_id: str, current_user=Depends(get_current_user)):
    result = get_scan_by_id(scan_id)
    if not result:
        raise HTTPException(status_code=404, detail="Scan not found")
    return result


@app.delete("/history/{scan_id}")
def remove_scan(scan_id: str, current_user=Depends(get_current_user)):
    delete_scan(scan_id)
    return {"status": "deleted"}


@app.get("/history/{scan_id}/sbom")
def get_sbom(scan_id: str, current_user=Depends(get_current_user)):
    result = get_scan_by_id(scan_id)
    if not result:
        raise HTTPException(status_code=404, detail="Scan not found")

    findings = result.get("results", [])
    summary = result.get("summary", {})
    filename = result.get("filename", "unknown")
    ext = os.path.splitext(filename)[1].lower()

    # Always include the model itself as a component
    components = [{
        "type": "ml-model",
        "name": filename,
        "version": "1.0.0",
        "purl": f"pkg:mlmodel/{filename}",
        "file_path": f"/scan/{filename}",
        "properties": [
            {"name": "format", "value": ext or "unknown"},
            {"name": "security_grade", "value": summary.get("security_grade", "N/A")},
            {"name": "total_issues", "value": str(summary.get("total_issues", 0))}
        ]
    }]

    # Add framework dependencies based on file type
    framework_deps = {
        ".bin": [("pytorch", "2.0.0"), ("numpy", "1.24.0")],
        ".pth": [("pytorch", "2.0.0"), ("torchvision", "0.15.0")],
        ".onnx": [("onnxruntime", "1.16.0"), ("protobuf", "4.24.0")],
        ".safetensors": [("safetensors", "0.4.0"), ("transformers", "4.35.0")],
        ".pkl": [("scikit-learn", "1.3.0"), ("numpy", "1.24.0")],
        ".h5": [("tensorflow", "2.13.0"), ("keras", "2.13.0")],
    }
    for name, version in framework_deps.get(ext, [("unknown-framework", "0.0.0")]):
        components.append({
            "type": "library",
            "name": name,
            "version": version,
            "purl": f"pkg:pypi/{name}@{version}"
        })

    # Build vulnerabilities from ALL findings (not just CRITICAL/HIGH)
    vulnerabilities = []
    for f in findings:
        if f.get("severity") in ("CRITICAL", "HIGH", "MEDIUM"):
            vulnerabilities.append({
                "id": f.get("id", "HEX-UNKNOWN"),
                "source": "HEX Scanner",
                "ratings": [{"severity": f.get("severity", "UNKNOWN"),
                             "score": f.get("cvss", {}).get("base_score") if f.get("cvss") else None}],
                "description": f.get("description", ""),
                "recommendation": f.get("remediation", ""),
                "cwe": f.get("cwe", []),
                "type": f.get("type", "")
            })

    return {
        "bomFormat": "CycloneDX",
        "specVersion": "1.4",
        "version": 1,
        "metadata": {
            "timestamp": result.get("scanned_at", ""),
            "tools": [{"vendor": "Layerd AI", "name": "Hex", "version": "1.0.0"}],
            "component": {"type": "ml-model", "name": filename, "version": "1.0.0"}
        },
        "components": components,
        "vulnerabilities": vulnerabilities,
        "summary": {
            "total_components": len(components),
            "total_vulnerabilities": len(vulnerabilities),
            "security_score": summary.get("security_score"),
            "security_grade": summary.get("security_grade")
        }
    }


# ── API Keys ──────────────────────────────────────────────────────────────────

@app.get("/apikeys")
def list_api_keys(current_user=Depends(get_current_user)):
    return get_user_api_keys(current_user["username"])


@app.post("/apikeys")
def create_key(name: str, current_user=Depends(get_current_user)):
    if not name.strip():
        raise HTTPException(status_code=400, detail="Name required")
    key = create_api_key(name, current_user["username"])
    return {"key": key, "message": "Save this key — it won't be shown again"}


@app.delete("/apikeys/{key_id}")
def revoke_key(key_id: int, current_user=Depends(get_current_user)):
    delete_api_key(key_id, current_user["username"])
    return {"status": "revoked"}


@app.put("/apikeys/{key_id}")
def toggle_key(key_id: int, enabled: bool, current_user=Depends(get_current_user)):
    toggle_api_key(key_id, enabled, current_user["username"])
    return {"status": "updated"}


# ── Webhooks ──────────────────────────────────────────────────────────────────

@app.get("/webhooks")
def list_webhooks(current_user=Depends(get_current_user)):
    return get_webhooks()


@app.post("/webhooks")
def create_webhook(
    name: str, url: str, wtype: str = "custom",
    notify_critical: bool = True, notify_all: bool = False,
    current_user=Depends(get_current_user)
):
    add_webhook(name, url, wtype, notify_critical, notify_all)
    return {"status": "created"}


@app.put("/webhooks/{wid}")
def toggle_webhook(wid: int, enabled: bool, current_user=Depends(get_current_user)):
    update_webhook(wid, enabled)
    return {"status": "updated"}


@app.delete("/webhooks/{wid}")
def remove_webhook(wid: int, current_user=Depends(get_current_user)):
    delete_webhook(wid)
    return {"status": "deleted"}


@app.post("/webhooks/{wid}/test")
def test_webhook(wid: int, current_user=Depends(get_current_user)):
    whs = get_webhooks()
    wh = next((w for w in whs if w["id"] == wid), None)
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook not found")
    test_result = {
        "filename": "test_model.safetensors",
        "scan_id": "test-000",
        "scanned_by": current_user["username"],
        "summary": {
            "total_issues": 3, "critical": 1, "high": 1, "medium": 1, "low": 0,
            "security_score": 65, "security_grade": "C", "verdict": "TEST - This is a test notification"
        }
    }
    from webhooks import _send_webhook
    _send_webhook(wh, test_result)
    return {"status": "test sent"}


# ── Model Library ─────────────────────────────────────────────────────────────

MODELS_DIR = os.environ.get("MODELS_DIR", os.path.join(os.path.dirname(__file__), "..", "models"))

@app.get("/models")
def list_models(current_user=Depends(get_current_user)):
    if not os.path.exists(MODELS_DIR):
        return []
    files = []
    for f in os.listdir(MODELS_DIR):
        path = os.path.join(MODELS_DIR, f)
        if os.path.isfile(path):
            files.append({
                "name": f,
                "size": os.path.getsize(path),
                "ext": os.path.splitext(f)[1].lower()
            })
    return sorted(files, key=lambda x: x["name"])


@app.post("/models/{filename}/scan")
def scan_model_file(filename: str, current_user=Depends(get_current_user)):
    file_path = os.path.join(MODELS_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Model file not found")

    tmp_dir = tempfile.mkdtemp()
    try:
        import shutil as _shutil
        _shutil.copy2(file_path, os.path.join(tmp_dir, filename))

        result = subprocess.run(
            ["docker", "run", "--rm", "-v", f"{tmp_dir}:/scan:ro", "layerd/hex:latest", "/scan", "--json"],
            capture_output=True, text=True, timeout=300
        )
        if result.returncode != 0 and not result.stdout.strip():
            raise HTTPException(status_code=500, detail=result.stderr)

        output = result.stdout.strip()
        json_start = output.find("{")
        if json_start == -1:
            raise HTTPException(status_code=500, detail="No JSON output from scanner")

        scan_result = json.loads(output[json_start:])
        scan_result["filename"] = filename
        scan_result["scanned_by"] = current_user["username"]
        scan_id = str(uuid.uuid4())
        scan_result["scan_id"] = scan_id
        save_scan(scan_id, filename, scan_result)
        return scan_result

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Scan timed out")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


# ── Model Registry ────────────────────────────────────────────────────────────

@app.get("/registry")
def list_registry(current_user=Depends(get_current_user)):
    return get_all_models()


@app.post("/registry")
def register(
    model_name: str, version: str, scan_id: str, notes: str = "",
    current_user=Depends(get_current_user)
):
    scan = get_scan_by_id(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    ok = register_model(model_name, version, scan_id, scan.get("filename", ""), current_user["username"], notes)
    if not ok:
        raise HTTPException(status_code=400, detail="Version already registered for this model")
    return {"status": "registered"}


@app.get("/registry/{model_name}")
def get_model(model_name: str, current_user=Depends(get_current_user)):
    versions = get_model_versions(model_name)
    if not versions:
        raise HTTPException(status_code=404, detail="Model not found")
    return {"model_name": model_name, "versions": versions}


@app.get("/registry/{model_name}/trend")
def model_trend(model_name: str, current_user=Depends(get_current_user)):
    return get_model_trend(model_name)


@app.delete("/registry/{registry_id}")
def delete_registry(registry_id: int, current_user=Depends(get_current_user)):
    delete_model_version(registry_id)
    return {"status": "deleted"}


# ── Compare ───────────────────────────────────────────────────────────────────

@app.get("/compare")
def compare_scans(scan_a: str, scan_b: str, current_user=Depends(get_current_user)):
    a = get_scan_by_id(scan_a)
    b = get_scan_by_id(scan_b)
    if not a or not b:
        raise HTTPException(status_code=404, detail="One or both scans not found")

    def summarize(s):
        return {
            "scan_id": s.get("scan_id"), "filename": s.get("filename"),
            "scanned_at": s.get("scanned_at"),
            "security_score": s.get("summary", {}).get("security_score", 0),
            "security_grade": s.get("summary", {}).get("security_grade"),
            "verdict": s.get("summary", {}).get("verdict"),
            "total_issues": s.get("summary", {}).get("total_issues", 0),
            "critical": s.get("summary", {}).get("critical", 0),
            "high": s.get("summary", {}).get("high", 0),
            "medium": s.get("summary", {}).get("medium", 0),
            "low": s.get("summary", {}).get("low", 0),
            "findings": s.get("results", [])
        }

    sa, sb = summarize(a), summarize(b)
    ids_a = {r["id"] for r in sa["findings"]}
    ids_b = {r["id"] for r in sb["findings"]}

    return {
        "scan_a": sa, "scan_b": sb,
        "score_delta": sb["security_score"] - sa["security_score"],
        "improved": sb["security_score"] > sa["security_score"],
        "fixed": [r for r in sa["findings"] if r["id"] not in ids_b],
        "new_issues": [r for r in sb["findings"] if r["id"] not in ids_a],
        "persisting": [r for r in sb["findings"] if r["id"] in ids_a]
    }
