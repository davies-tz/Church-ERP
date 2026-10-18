from pydantic import BaseModel


class AssignmentCreate(BaseModel):
    # Leaders are appointed FROM members ("a leader must be a member first").
    member_id: str
    role_key: str
    org_unit_id: str | None = None  # null = tenant-wide


class AssignmentResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    role_key: str
    role_label_en: str
    role_label_sw: str
    org_unit_id: str | None
    org_unit_name: str | None
    scope_path: str
    active: bool
    # returned only when a fresh login was provisioned for the appointed member
    temp_password: str | None = None


class GrantResponse(BaseModel):
    role_key: str
    scope_path: str
    capabilities: list[str]


class PermissionsResponse(BaseModel):
    user_id: str
    capabilities: list[str]
    grants: list[GrantResponse]


class RoleInfo(BaseModel):
    key: str
    label_en: str
    label_sw: str
    capabilities: list[str]
