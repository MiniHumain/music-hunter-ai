import os
import smtplib
from email.message import EmailMessage


SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587


def send_email(
    to_email: str,
    subject: str,
    body: str,
) -> None:
    gmail_address = os.getenv(
        "GMAIL_ADDRESS"
    )
    gmail_app_password = os.getenv(
        "GMAIL_APP_PASSWORD"
    )

    if not gmail_address:
        raise RuntimeError(
            "GMAIL_ADDRESS manquant"
        )

    if not gmail_app_password:
        raise RuntimeError(
            "GMAIL_APP_PASSWORD manquant"
        )

    message = EmailMessage()

    message["From"] = (
        f"Mini Humain <{gmail_address}>"
    )
    message["To"] = to_email
    message["Subject"] = subject

    message.set_content(body)

    with smtplib.SMTP(
        SMTP_HOST,
        SMTP_PORT,
        timeout=30,
    ) as smtp:
        smtp.starttls()

        smtp.login(
            gmail_address,
            gmail_app_password,
        )

        smtp.send_message(
            message
        )