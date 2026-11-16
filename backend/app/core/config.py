import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("NEXT_PUBLIC_APP_NAME", "OMNIS")
    environment: str = os.getenv("NODE_ENV", "development")
    allowed_origins_raw: str = os.getenv(
        "OMNIS_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,https://omnis-one.vercel.app",
    )
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./omnis.db")
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    auth_secret: str = os.getenv(
        "OMNIS_AUTH_SECRET", "omnis-dev-hmac-secret-do-not-use-in-prod-98f7a6d5c4b3"
    )
    world_bank_api_base: str = os.getenv(
        "WORLD_BANK_API_BASE", "https://api.worldbank.org/v2"
    )
    rest_countries_api_base: str = os.getenv(
        "REST_COUNTRIES_API_BASE", "https://restcountries.com/v3.1"
    )
    openalex_api_base: str = "https://api.openalex.org"
    wikimedia_api_base: str = os.getenv(
        "WIKIMEDIA_API_BASE", "https://en.wikipedia.org/api/rest_v1"
    )


settings = Settings()
