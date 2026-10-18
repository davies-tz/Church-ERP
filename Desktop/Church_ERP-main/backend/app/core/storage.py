"""Object storage (MinIO / S3-compatible). The minio client is synchronous, so calls
are offloaded to a thread to avoid blocking the async event loop.

Keys are tenant-prefixed (`<tenant_id>/<category>/<uuid>-<name>`) so a download handler
can verify the caller's tenant owns the object before streaming it."""
import asyncio
import io
import uuid

from minio import Minio

from app.core.config import settings

_client: Minio | None = None


def _get_client() -> Minio:
    global _client
    if _client is None:
        _client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
    return _client


def make_key(tenant_id: str, category: str, filename: str) -> str:
    safe = filename.replace("/", "_").replace("\\", "_")
    return f"{tenant_id}/{category}/{uuid.uuid4().hex}-{safe}"


def key_belongs_to(key: str, tenant_id: str) -> bool:
    return key.startswith(f"{tenant_id}/")


async def put(key: str, data: bytes, content_type: str) -> None:
    def _put():
        c = _get_client()
        if not c.bucket_exists(settings.MINIO_BUCKET):
            c.make_bucket(settings.MINIO_BUCKET)
        c.put_object(
            settings.MINIO_BUCKET, key, io.BytesIO(data), length=len(data),
            content_type=content_type,
        )

    await asyncio.to_thread(_put)


async def get(key: str) -> tuple[bytes, str]:
    def _get():
        c = _get_client()
        resp = c.get_object(settings.MINIO_BUCKET, key)
        try:
            return resp.read(), resp.headers.get("Content-Type", "application/octet-stream")
        finally:
            resp.close()
            resp.release_conn()

    return await asyncio.to_thread(_get)
