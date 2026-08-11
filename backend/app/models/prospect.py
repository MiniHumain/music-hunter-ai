from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Prospect(Base):
    __tablename__ = "prospects"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    company_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    country: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    city: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    website: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    linkedin: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    public_email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )

    public_phone: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    industry: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
        index=True,
    )

    priority: Mapped[int] = mapped_column(
        Integer,
        default=3,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        default="À contacter",
        index=True,
    )

    score: Mapped[float] = mapped_column(
        Float,
        default=0.0,
    )

    last_contacted_at: Mapped[datetime | None] = mapped_column(
    DateTime,
    nullable=True,
    default=None,
)

    replied_at: Mapped[datetime | None] = mapped_column(
    DateTime,
    nullable=True,
    default=None,
)

    follow_up_at: Mapped[datetime | None] = mapped_column(
    DateTime,
    nullable=True,
    default=None,
)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )