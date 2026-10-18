from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = (
        "postgresql+asyncpg://church_app:church_app_pw@localhost:5432/church_erp"
    )
    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SECRET: str = "change-me-in-production-please"
    JWT_ALG: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 720

    # Operator token guarding the platform provisioning API (create new churches).
    PLATFORM_ADMIN_TOKEN: str = "dev-platform-token"

    # Object storage (MinIO / S3-compatible) for uploaded files.
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minio"
    MINIO_SECRET_KEY: str = "minio12345"
    MINIO_BUCKET: str = "church-erp"
    MINIO_SECURE: bool = False
    MAX_UPLOAD_BYTES: int = 5 * 1024 * 1024  # 5 MB

    # e.g. grace.churcherp.app -> tenant slug "grace"
    BASE_DOMAIN: str = "churcherp.app"

    CORS_ORIGINS: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
