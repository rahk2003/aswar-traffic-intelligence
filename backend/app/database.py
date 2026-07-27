import os
from pathlib import Path
from threading import RLock
from typing import Generator

from dotenv import load_dotenv
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.runtime import is_demo_mode


BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

load_dotenv(ENV_FILE)

_engine: Engine | None = None
_engine_url: str | None = None
_session_factory: sessionmaker | None = None
_database_lock = RLock()


class Base(DeclarativeBase):
    pass


class DatabaseNotConfiguredError(
    RuntimeError
):
    pass


def get_database_url() -> str | None:
    value = os.getenv(
        "DATABASE_URL",
        "",
    ).strip()

    return value or None


def is_database_configured() -> bool:
    return get_database_url() is not None


def get_engine() -> Engine:
    global _engine
    global _engine_url
    global _session_factory

    database_url = get_database_url()

    if database_url is None:
        raise DatabaseNotConfiguredError(
            "Database service is not configured. "
            "Set DATABASE_URL to enable this feature."
        )

    with _database_lock:
        if (
            _engine is None
            or _engine_url != database_url
        ):
            if _engine is not None:
                _engine.dispose()

            _engine = create_engine(
                database_url,
                pool_pre_ping=True,
            )
            _engine_url = database_url
            _session_factory = None

    return _engine


def get_session_factory() -> sessionmaker:
    global _session_factory

    if _session_factory is None:
        with _database_lock:
            if _session_factory is None:
                _session_factory = sessionmaker(
                    bind=get_engine(),
                    autoflush=False,
                    autocommit=False,
                )

    return _session_factory


def reset_database_state() -> None:
    global _engine
    global _engine_url
    global _session_factory

    with _database_lock:
        if _engine is not None:
            _engine.dispose()

        _engine = None
        _engine_url = None
        _session_factory = None


def get_db() -> Generator[
    Session | None,
    None,
    None,
]:
    if is_demo_mode():
        yield None
        return

    try:
        database = get_session_factory()()
    except DatabaseNotConfiguredError as error:
        raise HTTPException(
            status_code=503,
            detail=str(error),
        ) from error

    try:
        yield database
    except SQLAlchemyError as error:
        raise HTTPException(
            status_code=503,
            detail=(
                "Database service is temporarily "
                "unavailable."
            ),
        ) from error
    finally:
        database.close()
