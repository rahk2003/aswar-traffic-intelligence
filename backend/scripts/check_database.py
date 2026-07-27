import sys
from pathlib import Path

from sqlalchemy import text

BACKEND_DIR = Path(__file__).resolve().parent.parent

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.database import get_engine


try:
    with get_engine().connect() as connection:
        result = connection.execute(
            text(
                """
                SELECT
                    current_database() AS database_name,
                    current_user AS database_user,
                    PostGIS_Version() AS postgis_version;
                """
            )
        ).mappings().one()

    print("\nDatabase connection successful")
    print(f"Database: {result['database_name']}")
    print(f"User: {result['database_user']}")
    print(f"PostGIS: {result['postgis_version']}")

except Exception as error:
    print("\nDatabase connection failed")
    print(error)
    raise
