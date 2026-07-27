from app.database import Base, get_engine
import app.models  # noqa: F401


def create_tables() -> None:
    Base.metadata.create_all(
        bind=get_engine()
    )
    print("Database tables created successfully")


if __name__ == "__main__":
    create_tables()
