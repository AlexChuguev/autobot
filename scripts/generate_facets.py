#!/usr/bin/env python3
"""Generate facets.json from catalog-feed.json, attributes.json and categories.json."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import date
from pathlib import Path
from typing import Any


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def write_json(path: Path, payload: dict[str, Any]) -> None:
    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False, indent=2)
        file.write("\n")


def build_facets(
    feed: dict[str, Any], attributes_data: dict[str, Any], categories_data: dict[str, Any]
) -> dict[str, Any]:
    products = feed.get("products", [])
    attributes = attributes_data.get("attributes", [])
    categories = categories_data.get("categories", [])

    attribute_by_code = {entry["code"]: entry for entry in attributes}
    category_id_by_name = {entry["name"]: entry["id"] for entry in categories}

    facets: dict[str, Any] = {
        "generatedAt": date.today().isoformat(),
        "global": {
            "price": {
                "min": min((product.get("price", 0) for product in products), default=0),
                "max": max((product.get("price", 0) for product in products), default=0),
            }
        },
        "categories": {},
    }

    for category in categories:
        category_id = category["id"]
        category_products = [
            product
            for product in products
            if category_id_by_name.get(product.get("category")) == category_id
        ]

        prices = [product.get("price", 0) for product in category_products]
        category_price = {
            "min": min(prices) if prices else 0,
            "max": max(prices) if prices else 0,
        }

        category_attributes: dict[str, Any] = {}

        for attr_code in category.get("filterAttributes", []):
            attr_meta = attribute_by_code.get(attr_code)
            if not attr_meta:
                continue

            source_key = attr_meta.get("sourceKey")
            if not source_key:
                continue

            values = [
                product.get("params", {}).get(source_key)
                for product in category_products
                if product.get("params", {}).get(source_key)
            ]

            if not values:
                continue

            counts = Counter(values)
            category_attributes[attr_code] = {
                "values": [
                    {"value": value, "count": counts[value]}
                    for value in sorted(counts.keys(), key=lambda item: str(item))
                ]
            }

        facets["categories"][category_id] = {
            "price": category_price,
            "attributes": category_attributes,
        }

    return facets


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate facets.json")
    parser.add_argument(
        "--feed",
        default="data/catalog-feed.json",
        help="Path to catalog feed JSON",
    )
    parser.add_argument(
        "--attributes",
        default="data/attributes.json",
        help="Path to attributes JSON",
    )
    parser.add_argument(
        "--categories",
        default="data/categories.json",
        help="Path to categories JSON",
    )
    parser.add_argument(
        "--out",
        default="data/facets.json",
        help="Output facets JSON path",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    feed_path = Path(args.feed)
    attributes_path = Path(args.attributes)
    categories_path = Path(args.categories)
    out_path = Path(args.out)

    feed = load_json(feed_path)
    attributes_data = load_json(attributes_path)
    categories_data = load_json(categories_path)

    facets = build_facets(feed, attributes_data, categories_data)
    write_json(out_path, facets)

    print(f"Generated {out_path}")


if __name__ == "__main__":
    main()
