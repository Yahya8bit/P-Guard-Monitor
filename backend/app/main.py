from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/login")
def authenticate(q: Any = None) -> dict[str, Any]:
    if q:
        return {"q": q}
    return {"message": "No query parameter provided"}
