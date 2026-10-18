"""Object-storage roundtrip (integration: requires the MinIO service)."""
from app.core import storage


async def test_put_get_roundtrip():
    key = storage.make_key("tenant-xyz", "misc", "hello world.txt")
    await storage.put(key, b"hello world", "text/plain")
    data, content_type = await storage.get(key)
    assert data == b"hello world"
    assert "text" in content_type


def test_key_tenant_scoping():
    key = storage.make_key("tenant-a", "member-photos", "p.jpg")
    assert key.startswith("tenant-a/member-photos/")
    assert storage.key_belongs_to(key, "tenant-a")
    assert not storage.key_belongs_to(key, "tenant-b")
