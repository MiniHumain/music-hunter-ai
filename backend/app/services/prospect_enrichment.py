import re
from html.parser import HTMLParser
from urllib.parse import (
    unquote,
    urljoin,
    urlparse,
)

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
    "press",
    "media",
    "marketing",
    "partnerships",
    "partners",
}


COMMON_CONTACT_PATHS = (
    "/contact",
    "/contact/",
    "/contact-us",
    "/contact-us/",
    "/about",
    "/about/",
    "/about-us",
    "/about-us/",
    "/team",
    "/studio",
    "/company",
    "/support",
    "/press",
    "/media",
    "/business",
)


CONTACT_KEYWORDS = (
    "contact",
    "about",
    "team",
    "studio",
    "company",
    "support",
    "press",
    "media",
    "business",
    "partner",
)


EMAIL_PATTERN = re.compile(
    r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}",
    re.IGNORECASE,
)


INVALID_EMAIL_PARTS = (
    "example.com",
    "example.org",
    "example.net",
    "sentry.io",
    "wixpress.com",
)


class LinkExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()

        self.links: list[
            tuple[str, str]
        ] = []

        self.mailto_links: list[str] = []

        self._current_href: str | None = None
        self._current_text: list[str] = []

    def handle_starttag(
        self,
        tag: str,
        attrs: list[
            tuple[str, str | None]
        ],
    ) -> None:
        if tag.lower() != "a":
            return

        href = dict(attrs).get("href")

        if not href:
            return

        if href.lower().startswith("mailto:"):
            self.mailto_links.append(
                href
            )

        self._current_href = href
        self._current_text = []

    def handle_data(
        self,
        data: str,
    ) -> None:
        if self._current_href is not None:
            self._current_text.append(
                data
            )

    def handle_endtag(
        self,
        tag: str,
    ) -> None:
        if (
            tag.lower() == "a"
            and self._current_href
            is not None
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
        (
            "http://",
            "https://",
        )
    ):
        value = f"https://{value}"

    return value.rstrip("/")


def domain_name(
    url: str,
) -> str:
    domain = (
        urlparse(url)
        .netloc
        .lower()
        .split(":")[0]
    )

    if domain.startswith("www."):
        domain = domain[4:]

    return domain


def is_same_domain(
    base_url: str,
    candidate_url: str,
) -> bool:
    base_domain = domain_name(
        base_url
    )

    candidate_domain = domain_name(
        candidate_url
    )

    if not (
        base_domain
        and candidate_domain
    ):
        return False

    return (
        candidate_domain
        == base_domain
        or candidate_domain.endswith(
            f".{base_domain}"
        )
    )


def is_valid_email(
    email: str,
) -> bool:
    value = email.strip().lower()

    if not EMAIL_PATTERN.fullmatch(
        value
    ):
        return False

    if any(
        invalid in value
        for invalid in INVALID_EMAIL_PARTS
    ):
        return False

    if value.endswith(
        (
            ".png",
            ".jpg",
            ".jpeg",
            ".gif",
            ".webp",
            ".svg",
        )
    ):
        return False

    return True


def extract_emails(
    html: str,
) -> set[str]:
    emails = {
        match
        .strip()
        .lower()
        for match
        in EMAIL_PATTERN.findall(html)
    }

    return {
        email
        for email in emails
        if is_valid_email(email)
    }


def extract_mailto_emails(
    html: str,
) -> set[str]:
    parser = LinkExtractor()

    try:
        parser.feed(html)
    except Exception:
        return set()

    emails: set[str] = set()

    for href in parser.mailto_links:
        value = href[len("mailto:"):]

        value = value.split(
            "?",
            1,
        )[0]

        value = unquote(value)

        for email in value.split(","):
            clean_email = (
                email
                .strip()
                .lower()
            )

            if is_valid_email(
                clean_email
            ):
                emails.add(
                    clean_email
                )

    return emails


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
            f"{href_lower} "
            f"{text_lower}"
        )

        if not any(
            keyword in searchable
            for keyword
            in CONTACT_KEYWORDS
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
            links.append(
                absolute_url
            )

    return links[:8]


def email_priority(
    email: str,
) -> tuple[int, int, str]:
    local_part = email.split(
        "@",
        1,
    )[0]

    if local_part in GENERIC_EMAIL_PREFIXES:
        return (
            0,
            len(local_part),
            email,
        )

    return (
        1,
        len(local_part),
        email,
    )


def extract_page_emails(
    html: str,
) -> set[str]:
    emails = extract_emails(
        html
    )

    emails.update(
        extract_mailto_emails(
            html
        )
    )

    return emails


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
        ),
        "Accept": (
            "text/html,"
            "application/xhtml+xml"
        ),
    }

    found_emails: set[str] = set()

    with httpx.Client(
        headers=headers,
        timeout=10.0,
        follow_redirects=True,
    ) as client:
        try:
            homepage_response = (
                client.get(
                    base_url
                )
            )
        except httpx.HTTPError:
            return None

        if (
            homepage_response
            .status_code
            >= 400
        ):
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
            homepage_response
            .headers
            .get(
                "content-type",
                "",
            )
            .lower()
        )

        if (
            "text/html"
            not in content_type
            and
            "application/xhtml+xml"
            not in content_type
        ):
            return None

        homepage_html = (
            homepage_response.text
        )

        found_emails.update(
            extract_page_emails(
                homepage_html
            )
        )

        discovered_urls = (
            extract_contact_links(
                homepage_url,
                homepage_html,
            )
        )

        urls: list[str] = []

        for path in (
            COMMON_CONTACT_PATHS
        ):
            url = urljoin(
                homepage_url,
                path,
            )

            if url not in urls:
                urls.append(url)

        for url in discovered_urls:
            if url not in urls:
                urls.append(url)

        for url in urls[:12]:
            try:
                response = client.get(
                    url
                )

                if (
                    response.status_code
                    >= 400
                ):
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
                    response
                    .headers
                    .get(
                        "content-type",
                        "",
                    )
                    .lower()
                )

                if (
                    "text/html"
                    not in content_type
                    and
                    "application/xhtml+xml"
                    not in content_type
                ):
                    continue

                found_emails.update(
                    extract_page_emails(
                        response.text
                    )
                )

            except httpx.HTTPError:
                continue

    if not found_emails:
        return None

    return sorted(
        found_emails,
        key=email_priority,
    )[0]
def find_company_linkedin(
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
        ),
        "Accept": (
            "text/html,"
            "application/xhtml+xml"
        ),
    }

    with httpx.Client(
        headers=headers,
        timeout=10.0,
        follow_redirects=True,
    ) as client:
        try:
            response = client.get(
                base_url
            )
        except httpx.HTTPError:
            return None

        if response.status_code >= 400:
            return None

        content_type = (
            response
            .headers
            .get(
                "content-type",
                "",
            )
            .lower()
        )

        if (
            "text/html"
            not in content_type
            and
            "application/xhtml+xml"
            not in content_type
        ):
            return None

        parser = LinkExtractor()

        try:
            parser.feed(
                response.text
            )
        except Exception:
            return None

        linkedin_links: list[str] = []

        for href, _text in parser.links:
            if not href:
                continue

            absolute_url = urljoin(
                str(response.url),
                href,
            )

            parsed = urlparse(
                absolute_url
            )

            domain = parsed.netloc.lower()

            if domain.startswith("www."):
                domain = domain[4:]

            if domain not in {
                "linkedin.com",
                "fr.linkedin.com",
                "ca.linkedin.com",
                "uk.linkedin.com",
            }:
                continue

            path = parsed.path.lower()

            if (
                "/company/" not in path
                and
                "/showcase/" not in path
            ):
                continue

            clean_url = (
                f"{parsed.scheme}://"
                f"{parsed.netloc}"
                f"{parsed.path}"
            ).rstrip("/")

            if clean_url not in linkedin_links:
                linkedin_links.append(
                    clean_url
                )

        if not linkedin_links:
            return None

        return linkedin_links[0]
    