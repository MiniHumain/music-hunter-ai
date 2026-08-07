from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProspectBase(BaseModel):
    company_name: str = Field(min_length=1, max_length=255)

    country: str | None = None
    city: str | None = None

    website: str | None = None
    linkedin: str | None = None

    public_email: str | None = None
    public_phone: str | None = None

    industry: str | None = None

    priority: int = Field(default=3, ge=1, le=5)
    status: str = "À contacter"

    score: float = Field(default=0.0, ge=0, le=100)


class ProspectCreate(ProspectBase):
    """Données nécessaires pour créer un prospect."""

    pass


class ProspectUpdate(BaseModel):
    """Champs modifiables d'un prospect."""

    company_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
    )

    country: str | None = None
    city: str | None = None

    website: str | None = None
    linkedin: str | None = None

    public_email: str | None = None
    public_phone: str | None = None

    industry: str | None = None

    priority: int | None = Field(
        default=None,
        ge=1,
        le=5,
    )

    status: str | None = None

    score: float | None = Field(
        default=None,
        ge=0,
        le=100,
    )


class ProspectRead(ProspectBase):
    """Prospect renvoyé par l'API."""

    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)