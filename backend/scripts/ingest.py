"""CLI entrypoint: python scripts/ingest.py"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.ingest import run

if __name__ == "__main__":
    asyncio.run(run())
