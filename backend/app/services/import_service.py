import csv
import io

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.prospect import Prospect


def clean_value(value: str | None) -> str | None:
    if value is None:
        return None

    value = value.strip()

    return value if value else None


def import_prospects_from_csv(
    db: Session,
    content: bytes,
) -> dict[str, int]:
    text = content.decode("utf-8-sig")

    reader = csv.DictReader(io.StringIO(text))

    imported = 0
    duplicates = 0
    ignored = 0

    for row in reader:
        company_name = clean_value(
            row.get("company_name")
        )

        if not company_name:
            ignored += 1
            continue

        public_email = clean_value(
            row.get("public_email")
        )

        website = clean_value(
            row.get("website")
        )

        duplicate = None

        if public_email:
            duplicate = db.scalar(
                select(Prospect).where(
                    Prospect.public_email == public_email
                )
            )

        if duplicate is None and website:
            duplicate = db.scalar(
                select(Prospect).where(
                    Prospect.website == website
                )
            )

        if duplicate is not None:
            duplicates += 1
            continue

        try:
            priority = int(
                clean_value(row.get("priority")) or 3
            )
        except ValueError:
            priority = 3

        priority = max(1, min(priority, 5))

        try:
            score = float(
                clean_value(row.get("score")) or 0
            )
        except ValueError:
            score = 0

        score = max(0, min(score, 100))

        prospect = Prospect(
            company_name=company_name,
            country=clean_value(row.get("country")),
            city=clean_value(row.get("city")),
            website=website,
            linkedin=clean_value(row.get("linkedin")),
            public_email=public_email,
            public_phone=clean_value(
                row.get("public_phone")
            ),
            industry=clean_value(row.get("industry")),
            priority=priority,
            status=clean_value(row.get("status"))
            or "À contacter",
            score=score,
        )

        db.add(prospect)
        imported += 1

    db.commit()

    return {
        "imported": imported,
        "duplicates": duplicates,
        "ignored": ignored,
    }