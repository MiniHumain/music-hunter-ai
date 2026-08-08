import re
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

import httpx


GENERIC_EMAIL_PREFIXES = {
    "contact",
    "hello",
    "info",
    "business",
    "sales",
    "studio",
    "office",
    "team",
    "support",
}


COMMON_CONTACT_PATHS = (
    "/contact",
    "/contact-us",
    "/about",
    "/about-us",
)


CONTACT_KEYWORDS = (
    "contact",
    "about",
    "team",
    "studio",
    "company",
)


EMAIL_PATTERN = re.compile(
    r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}",
    re.IGNORECASE,
)


class LinkExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self._current_href: str | None = None
        self._current_text: list[str] = []

    def handle_starttag(
        self,
        tag: str,
        attrs: list[tuple[str, str | None]],
    ) -> None:
        if tag.lower() != "a":
            return

        href = dict(attrs).get("href")

        if not href:
            return

        self._current_href = href
        self._current_text = []

    def handle_data(
        self,
        data: str,
    ) -> None:
        if self._current_href is not None:
            self._current_text.append(data)

    def handle_endtag(
        self,
        tag: str,
    ) -> None:
        if (
            tag.lower() == "a"
            and self._current_href is not None
        ):
            text = " ".join(
                self._current_text
            ).strip()

            self.links.append(
                (
                    self._current_href,
                    text,
                )
            )

            self._current_href = None
            self._current_text = []


def normalize_website(
    url: str,
) -> str:
    value = url.strip()

    if not value.startswith(
        ("http://", "https://")
    ):
        value = f"https://{value}"

    return value.rstrip("/")


def domain_name(
    url: str,
) -> str:
    domain = urlparse(url).netloc.lower()

    if domain.startswith("www."):
        domain = domain[4:]

    return domain


def is_same_domain(
    base_url: str,
    candidate_url: str,
) -> bool:
    base_domain = domain_name(base_url)
    candidate_domain = domain_name(
        candidate_url
    )

    return (
        candidate_domain == base_domain
        or candidate_domain.endswith(
            f".{base_domain}"
        )
    )


def extract_emails(
    html: str,
) -> set[str]:
    emails = {
        match.lower()
        for match in EMAIL_PATTERN.findall(html)
    }

    return {
        email
        for email in emails
        if not email.endswith(
            (
                ".png",
                ".jpg",
                ".jpeg",
                ".gif",
                ".webp",
            )
        )
    }


def extract_contact_links(
    base_url: str,
    html: str,
) -> list[str]:
    parser = LinkExtractor()

    try:
        parser.feed(html)
    except Exception:
        return []

    links: list[str] = []

    for href, text in parser.links:
        href_lower = href.lower()
        text_lower = text.lower()

        if href_lower.startswith(
            (
                "mailto:",
                "tel:",
                "javascript:",
                "#",
            )
        ):
            continue

        searchable = (
            f"{href_lower} {text_lower}"
        )

        if not any(
            keyword in searchable
            for keyword in CONTACT_KEYWORDS
        ):
            continue

        absolute_url = urljoin(
            base_url,
            href,
        )

        if not is_same_domain(
            base_url,
            absolute_url,
        ):
            continue

        if absolute_url not in links:
            links.append(absolute_url)

    return links[:5]


def email_priority(
    email: str,
) -> int:
    local_part = email.split(
        "@",
        1,
    )[0]

    if local_part in GENERIC_EMAIL_PREFIXES:
        return 0

    return 1


def find_best_public_email(
    website: str,
) -> str | None:
    base_url = normalize_website(
        website
    )

    headers = {
        "User-Agent": (
            "MusicHunterAIBot/0.1 "
            "(https://github.com/"
            "MiniHumain/music-hunter-ai)"
        )
    }

    found_emails: set[str] = set()

    with httpx.Client(
        headers=headers,
        timeout=10.0,
        follow_redirects=True,
    ) as client:
        try:
            homepage_response = client.get(
                base_url
            )
        except httpx.HTTPError:
            return None

        if homepage_response.status_code >= 400:
            return None

        homepage_url = str(
            homepage_response.url
        )

        if not is_same_domain(
            base_url,
            homepage_url,
        ):
            return None

        content_type = (
            homepage_response.headers.get(
                "content-type",
                "",
            )
        )

        if "text/html" not in content_type:
            return None

        homepage_html = (
            homepage_response.text
        )

        found_emails.update(
            extract_emails(
                homepage_html
            )
        )

        discovered_urls = (
            extract_contact_links(
                homepage_url,
                homepage_html,
            )
        )

        urls = []

        for path in COMMON_CONTACT_PATHS:
            url = urljoin(
                homepage_url,
                path,
            )

            if url not in urls:
                urls.append(url)

        for url in discovered_urls:
            if url not in urls:
                urls.append(url)

        for url in urls[:8]:
            try:
                response = client.get(url)

                if response.status_code >= 400:
                    continue

                final_url = str(
                    response.url
                )

                if not is_same_domain(
                    homepage_url,
                    final_url,
                ):
                    continue

                content_type = (
                    response.headers.get(
                        "content-type",
                        "",
                    )
                )

                if (
                    "text/html"
                    not in content_type
                ):
                    continue

                found_emails.update(
                    extract_emails(
                        response.text
                    )
                )

            except httpx.HTTPError:
                continue

    if not found_emails:
        return None

    return sorted(
        found_emails,
        key=lambda email: (
            email_priority(email),
            email,
        ),
    )[0]