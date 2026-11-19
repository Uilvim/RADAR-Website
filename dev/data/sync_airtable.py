"""Sync the Airtable base into data/*.csv, then rebuild radar-data.js.

Usage (from the dev folder):
    set AIRTABLE_TOKEN=pat...        (PowerShell: $env:AIRTABLE_TOKEN = "pat...")
    python data/sync_airtable.py

The token needs only the data.records:read scope on the "Rice AI Support for
Research" base. Standard library only.
"""
import csv
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE_ID = "appxk3mYIclxCtpxo"
HERE = Path(__file__).parent

# table id -> (csv file, primary field used to resolve links to that table)
TABLES = {
    "tblgpHkgzWxTC3SGf": ("ai-resources.csv", "Resource Name"),
    "tblHMNmWG0MTNfqgE": ("what-we-offer.csv", "Service Name"),
    "tblL0sFnw9CEqPY6A": ("points-of-contact.csv", "Person"),
    "tbl7bkpZTUjTqPlku": ("workshop-catalog.csv", "Name"),
    "tblvO7GdlCScqYktz": ("research-groups.csv", "Group Name"),
}
REC_ID = re.compile(r"^rec[A-Za-z0-9]{14}$")


def fetch_table(table_id, token):
    records, offset = [], None
    while True:
        query = {"pageSize": 100, "returnFieldsByFieldId": "false"}
        if offset:
            query["offset"] = offset
        req = urllib.request.Request(
            f"https://api.airtable.com/v0/{BASE_ID}/{table_id}?{urllib.parse.urlencode(query)}",
            headers={"Authorization": f"Bearer {token}"},
        )
        for attempt in range(4):
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    page = json.load(resp)
                break
            except urllib.error.HTTPError as e:
                if e.code == 429 and attempt < 3:
                    time.sleep(2 ** attempt)
                    continue
                sys.exit(f"Airtable returned HTTP {e.code} for {table_id}: {e.read().decode()[:200]}")
        records += page["records"]
        offset = page.get("offset")
        if not offset:
            return records


def join_list(items):
    """Join values the way Airtable CSV exports do: comma separated, quoting items that contain commas."""
    buf = io.StringIO()
    csv.writer(buf, lineterminator="").writerow(items)
    return buf.getvalue()


def to_cell(value, names):
    if value is None:
        return ""
    if isinstance(value, list):
        out = []
        for v in value:
            if isinstance(v, dict):
                continue  # attachments have expiring URLs; use a URL field instead
            v = names.get(v, v) if isinstance(v, str) and REC_ID.match(v) else v
            out.append(str(v))
        return join_list(list(dict.fromkeys(out)))
    if isinstance(value, dict):
        return value.get("name") or value.get("email") or ""
    if isinstance(value, bool):
        return "checked" if value else ""
    return str(value)


def main():
    token = os.environ.get("AIRTABLE_TOKEN")
    if not token:
        sys.exit("Set AIRTABLE_TOKEN to an Airtable personal access token (data.records:read).")

    fetched = {tid: fetch_table(tid, token) for tid in TABLES}
    names = {
        rec["id"]: str(rec["fields"].get(primary, "")).strip()
        for tid, (_, primary) in TABLES.items()
        for rec in fetched[tid]
    }

    for tid, (filename, primary) in TABLES.items():
        records = fetched[tid]
        # Primary field first, then the remaining fields in the order they appear.
        columns = [primary] + [c for c in dict.fromkeys(k for r in records for k in r["fields"]) if c != primary]
        with open(HERE / filename, "w", encoding="utf-8-sig", newline="") as f:
            w = csv.writer(f)
            w.writerow(columns)
            for rec in records:
                w.writerow([to_cell(rec["fields"].get(c), names) for c in columns])
        print(f"{filename}: {len(records)} records")

    sys.path.insert(0, str(HERE))
    import build_data
    build_data.build()


if __name__ == "__main__":
    main()
