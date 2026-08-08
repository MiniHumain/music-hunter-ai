import re
import time

import httpx

from app.collectors.base import (
    BaseCollector,
    CollectedProspect,
)


COUNTRY_IDS = {
    "france": "Q142",
    "canada": "Q16",
    "royaume-uni": "Q145",
    "royaume uni": "Q145",
    "united kingdom": "Q145",
    "allemagne": "Q183",
    "germany": "Q183",
    "espagne": "Q29",
    "spain": "Q29",
    "italie": "Q38",
    "italy": "Q38",
    "états-unis": "Q30",
    "etats-unis": "Q30",
    "united states": "Q30",
    "usa": "Q30",
    "belgique": "Q31",
    "belgium": "Q31",
    "suisse": "Q39",
    "switzerland": "Q39",
}


INDUSTRIES = {
    "jeux vidéo": {
        "id": "Q941594",
        "label": "Jeux vidéo",
    },
    "jeux video": {
        "id": "Q941594",
        "label": "Jeux vidéo",
    },
    "jeux vidéos": {
        "id": "Q941594",
        "label": "Jeux vidéo",
    },
    "video games": {
        "id": "Q941594",
        "label": "Jeux vidéo",
    },

    "publicité": {
        "id": "Q23700481",
        "label": "Publicité",
    },
    "publicite": {
        "id": "Q23700481",
        "label": "Publicité",
    },
    "advertising": {
        "id": "Q23700481",
        "label": "Publicité",
    },

    "cinéma": {
        "id": "Q1415395",
        "label": "Cinéma",
    },
    "cinema": {
        "id": "Q1415395",
        "label": "Cinéma",
    },
    "film": {
        "id": "Q1415395",
        "label": "Cinéma",
    },
    "film industry": {
        "id": "Q1415395",
        "label": "Cinéma",
    },

    "musique": {
        "id": "Q746359",
        "label": "Musique",
    },
    "music": {
        "id": "Q746359",
        "label": "Musique",
    },
    "music industry": {
        "id": "Q746359",
        "label": "Musique",
    },
}


WIKIDATA_ID_PATTERN = re.compile(
    r"^Q\d+$",
    re.IGNORECASE,
)


class WikidataCollector(BaseCollector):
    ENDPOINT = "https://query.wikidata.org/sparql"

    def __init__(
        self,
        country: str | None = None,
        industry: str | None = None,
        limit: int = 20,
    ) -> None:
        self.country = country
        self.industry = industry
        self.limit = max(
            1,
            min(limit, 200),
        )

    def _get_country_id(
        self,
    ) -> str | None:
        if not self.country:
            return None

        key = self.country.strip().lower()

        return COUNTRY_IDS.get(key)

    def _get_industry(
        self,
    ) -> dict[str, str] | None:
        if not self.industry:
            return None

        key = self.industry.strip().lower()

        return INDUSTRIES.get(key)

    def _build_query(
        self,
    ) -> tuple[str, str | None]:
        country_id = self._get_country_id()
        industry = self._get_industry()

        country_clause = ""
        industry_clause = ""
        industry_label = None

        if (
            self.country
            and country_id is None
        ):
            raise ValueError(
                f"Pays non supporté : {self.country}"
            )

        if (
            self.industry
            and industry is None
        ):
            raise ValueError(
                f"Secteur non supporté : {self.industry}"
            )

        if country_id:
            country_clause = (
                f"?company wdt:P17 wd:{country_id} ."
            )

        if industry:
            industry_clause = (
                "?company "
                f"wdt:P452 wd:{industry['id']} ."
            )

            industry_label = industry["label"]

        query = f"""
        SELECT DISTINCT
            ?company
            ?companyLabel
            ?website
            ?countryLabel
            ?cityLabel
        WHERE {{
            ?company wdt:P31 wd:Q4830453 ;
                     wdt:P856 ?website .

            {country_clause}
            {industry_clause}

            OPTIONAL {{
                ?company wdt:P17 ?country .
            }}

            OPTIONAL {{
                ?company wdt:P159 ?city .
            }}

            SERVICE wikibase:label {{
                bd:serviceParam
                    wikibase:language "fr,en" .
            }}
        }}
        LIMIT {self.limit}
        """

        return query, industry_label

    def _request_wikidata(
        self,
        query: str,
    ) -> dict:
        headers = {
            "User-Agent": (
                "MusicHunterAIBot/0.1 "
                "(https://github.com/"
                "MiniHumain/music-hunter-ai)"
            ),
            "Accept": (
                "application/"
                "sparql-results+json"
            ),
        }

        retry_statuses = {
            429,
            502,
            503,
            504,
        }

        max_attempts = 3

        for attempt in range(
            1,
            max_attempts + 1,
        ):
            response = httpx.get(
                self.ENDPOINT,
                params={
                    "query": query,
                    "format": "json",
                },
                headers=headers,
                timeout=60.0,
                follow_redirects=True,
            )

            if (
                response.status_code
                not in retry_statuses
            ):
                response.raise_for_status()

                return response.json()

            if attempt == max_attempts:
                response.raise_for_status()

            wait_seconds = attempt * 2

            time.sleep(wait_seconds)

        raise RuntimeError(
            "Wikidata n'a pas répondu correctement."
        )

    def _is_valid_company_name(
        self,
        company_name: str | None,
    ) -> bool:
        if not company_name:
            return False

        name = company_name.strip()

        if not name:
            return False

        if WIKIDATA_ID_PATTERN.fullmatch(
            name
        ):
            return False

        return True

    def collect(
        self,
    ) -> list[CollectedProspect]:
        query, industry_label = (
            self._build_query()
        )

        data = self._request_wikidata(
            query
        )

        bindings = (
            data
            .get("results", {})
            .get("bindings", [])
        )

        prospects: list[
            CollectedProspect
        ] = []

        for item in bindings:
            company_name = (
                item
                .get("companyLabel", {})
                .get("value")
            )

            if not self._is_valid_company_name(
                company_name
            ):
                continue

            website = (
                item
                .get("website", {})
                .get("value")
            )

            country = (
                item
                .get("countryLabel", {})
                .get("value")
            )

            city = (
                item
                .get("cityLabel", {})
                .get("value")
            )

            prospects.append(
                CollectedProspect(
                    company_name=(
                        company_name.strip()
                    ),
                    country=country,
                    city=city,
                    website=website,
                    industry=industry_label,
                    source="wikidata",
                )
            )

        return prospects