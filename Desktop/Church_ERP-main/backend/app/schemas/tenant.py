from pydantic import BaseModel


class ChurchOption(BaseModel):
    id: str
    name: str
    level_key: str


class BrandingResponse(BaseModel):
    slug: str
    name: str
    display_name: str
    tagline: str | None
    logo_light_url: str | None
    logo_dark_url: str | None
    login_bg_url: str | None
    color_primary: str
    color_secondary: str
    color_accent: str
    font_key: str
    default_locale: str
    enabled_locales: list[str]
