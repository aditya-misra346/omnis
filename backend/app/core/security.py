import hashlib
import hmac
import re
import secrets
import time
from typing import Dict, List, Tuple
from app.core.config import settings

PROMPT_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions", re.I),
    re.compile(r"disregard\s+(all\s+)?(previous|prior|system)\s+(instructions|prompts)", re.I),
    re.compile(r"reveal\s+(your\s+)?(system\s+prompt|api\s+key|secret|credentials)", re.I),
    re.compile(r"you\s+are\s+now\s+in\s+(developer|dan|jailbreak)\s+mode", re.I),
    re.compile(r"<\s*script\b", re.I),
]

_RATE_LIMIT_BUCKETS: Dict[str, List[float]] = {}


def check_prompt_injection(text: str) -> Tuple[bool, str]:
    """Detect prompt injection or XSS payloads in user/external inputs."""
    if not text:
        return True, ""
    for pattern in PROMPT_INJECTION_PATTERNS:
        if pattern.search(text):
            return (
                False,
                "Input rejected by OMNIS AI Security Guardrail: Potential instruction-override or script injection pattern detected.",
            )
    return True, text.strip()


def check_rate_limit(client_ip: str, limit: int = 120, window_seconds: int = 60) -> bool:
    """Sliding-window rate limiter per client identifier."""
    now = time.time()
    timestamps = _RATE_LIMIT_BUCKETS.get(client_ip, [])
    timestamps = [t for t in timestamps if now - t < window_seconds]
    if len(timestamps) >= limit:
        _RATE_LIMIT_BUCKETS[client_ip] = timestamps
        return False
    timestamps.append(now)
    _RATE_LIMIT_BUCKETS[client_ip] = timestamps
    return True


def hash_password(password: str, salt: str | None = None) -> str:
    salt_val = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt_val.encode("utf-8"), 100_000
    ).hex()
    return f"{salt_val}${digest}"


def verify_password(password: str, stored_hash: str) -> bool:
    if "$" not in stored_hash:
        return False
    salt_val, _ = stored_hash.split("$", 1)
    expected = hash_password(password, salt_val)
    return hmac.compare_digest(expected, stored_hash)


def create_session_token(user_id: str) -> str:
    issued = str(int(time.time()))
    nonce = secrets.token_hex(8)
    payload = f"{user_id}.{issued}.{nonce}"
    sig = hmac.new(
        settings.auth_secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    return f"{payload}.{sig}"
