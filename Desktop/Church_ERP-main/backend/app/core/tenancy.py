from app.core.config import settings


def resolve_tenant_slug(host: str | None, header_slug: str | None) -> str | None:
    """Work out which church this request is for.

    Priority:
      1. Explicit X-Tenant-Slug header (used for local dev and API clients).
      2. Subdomain of the Host header:
         - grace.churcherp.app  -> "grace"
         - grace.localhost:5173 -> "grace"
    Returns None if no tenant can be determined (e.g. the bare apex domain).
    """
    if header_slug:
        return header_slug.strip().lower() or None

    if not host:
        return None

    hostname = host.split(":")[0].lower()  # strip port

    # <slug>.<base_domain>
    base = settings.BASE_DOMAIN.lower()
    if hostname.endswith("." + base):
        sub = hostname[: -(len(base) + 1)]
        return sub.split(".")[0] or None

    # <slug>.localhost for local development
    if hostname.endswith(".localhost"):
        return hostname[: -len(".localhost")].split(".")[0] or None

    return None
