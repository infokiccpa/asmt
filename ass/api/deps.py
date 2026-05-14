import os
from fastapi import Header, HTTPException

_API_KEY = os.getenv("INTERNAL_API_KEY", "")

async def verify_api_key(x_api_key: str = Header(..., alias="X-API-Key")):
    if not _API_KEY:
        raise HTTPException(status_code=503, detail="Service not configured: INTERNAL_API_KEY is not set")
    if x_api_key != _API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
