import uuid

import psycopg
from langchain_postgres import PostgresChatMessageHistory

from app.config import get_database_url

TABLE_NAME = "case_chat_history"

SESSION_NAMESPACE = uuid.UUID("6f2f6c9e-6e2e-4a3f-9f3f-2b6e6f6c9e6f")

sync_connection = psycopg.connect(get_database_url())

def ensure_chat_tables() -> None:
    PostgresChatMessageHistory.create_tables(sync_connection, TABLE_NAME)


def _session_id_for_case(case_id: str) -> str:
    return str(uuid.uuid5(SESSION_NAMESPACE, case_id))


def get_chat_history(case_id: str) -> PostgresChatMessageHistory:
    session_id = _session_id_for_case(case_id)
    return PostgresChatMessageHistory(TABLE_NAME, session_id, sync_connection=sync_connection)
