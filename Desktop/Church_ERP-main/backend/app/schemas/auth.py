import datetime

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=6, max_length=200)
    org_unit_id: str  # the church the member currently belongs to
    phone: str | None = None
    gender: str | None = None
    dob: datetime.date | None = None
    region: str | None = None
    district: str | None = None


class LoginRequest(BaseModel):
    # Plain str, not EmailStr: the login identifier is matched against the stored
    # value, and demo accounts use reserved .local addresses that strict RFC
    # validation rejects. Email format is validated at registration, not login.
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=200)


class MeResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    tenant_slug: str
    member_id: str | None = None
    verification_status: str | None = None  # null if the user isn't a member
