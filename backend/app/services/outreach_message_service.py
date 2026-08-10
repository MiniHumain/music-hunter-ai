from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.outreach_message import OutreachMessage
from app.models.prospect import Prospect
from app.schemas.outreach_message import (
    OutreachMessageCreate,
    OutreachMessageUpdate,
)


def create_outreach_message(
    db: Session,
    data: OutreachMessageCreate,
) -> OutreachMessage:
    prospect = db.get(
        Prospect,
        data.prospect_id,
    )

    if prospect is None:
        raise ValueError(
            "Prospect introuvable"
        )

    message = OutreachMessage(
        prospect_id=data.prospect_id,
        subject=data.subject.strip(),
        body=data.body.strip(),
        status="draft",
    )

    db.add(message)
    db.commit()
    db.refresh(message)

    return message


def get_outreach_messages(
    db: Session,
    prospect_id: int | None = None,
) -> list[OutreachMessage]:
    statement = (
        select(OutreachMessage)
        .order_by(
            OutreachMessage.created_at.desc()
        )
    )

    if prospect_id is not None:
        statement = statement.where(
            OutreachMessage.prospect_id
            == prospect_id
        )

    return list(
        db.scalars(statement).all()
    )


def get_outreach_message_by_id(
    db: Session,
    message_id: int,
) -> OutreachMessage | None:
    return db.get(
        OutreachMessage,
        message_id,
    )


def update_outreach_message(
    db: Session,
    message: OutreachMessage,
    data: OutreachMessageUpdate,
) -> OutreachMessage:
    update_data = data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        if (
            field in {"subject", "body"}
            and isinstance(value, str)
        ):
            value = value.strip()

        setattr(
            message,
            field,
            value,
        )

    db.add(message)
    db.commit()
    db.refresh(message)

    return message


def delete_outreach_message(
    db: Session,
    message: OutreachMessage,
) -> None:
    db.delete(message)
    db.commit()