from pydantic import BaseModel


class LevelResponse(BaseModel):
    key: str
    label_en: str
    label_sw: str
    depth: int
    parent_key: str | None


class OrgUnitCreate(BaseModel):
    level_key: str
    name: str
    parent_id: str | None = None
    code: str | None = None
    region: str | None = None
    district: str | None = None


class LeaderInfo(BaseModel):
    role_key: str
    role_label_en: str
    role_label_sw: str
    user_name: str


class OrgUnitResponse(BaseModel):
    id: str
    level_key: str
    name: str
    code: str | None
    region: str | None
    district: str | None
    parent_id: str | None
    path: str
    depth: int  # number of ancestors (derived from path)
    leaders: list[LeaderInfo]


class ImportResult(BaseModel):
    created: int
    errors: list[str]
