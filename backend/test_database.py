from sqlalchemy import text

from app.database import engine


try:
    with engine.connect() as connection:
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
