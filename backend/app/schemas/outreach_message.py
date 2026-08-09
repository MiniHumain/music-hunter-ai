from datetime import datetime

from pydantic import BaseModel, ConfigDict


class OutreachMessageCreate(BaseModel):
    prospect_id: int
    subject: str
    body: str


class OutreachMessageRead(BaseModel):
    id: int
    prospect_id: int
    subject: str
    body: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )