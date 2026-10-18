from pydantic import BaseModel, Field


class TemplateLevel(BaseModel):
    key: str
    label_en: str
    label_sw: str


class TemplateInfo(BaseModel):
    key: str
    label: str
    levels: list[TemplateLevel]


class TenantSummary(BaseModel):
    slug: str
    name: str
    display_name: str


class ProvisionRequest(BaseModel):
    slug: str = Field(min_length=2, max_length=40)
    name: str = Field(min_length=2, max_length=200)
    template: str
    admin_name: str = Field(min_length=2, max_length=200)
    admin_email: str = Field(min_length=3, max_length=255)
    admin_password: str = Field(min_length=8, max_length=200)
    display_name: str | None = None
    tagline: str | None = None
    color_primary: str | None = None
    color_secondary: str | None = None
    color_accent: str | None = None
    default_locale: str = "en"


class ProvisionResponse(BaseModel):
    id: str
    slug: str
    name: str
    admin_email: str
    portal_path: str
