#!/usr/bin/env python3
import json, os, sys
from datetime import datetime, timezone
from pathlib import Path
import requests

API_BASE = "https://api.mapmyfitness.com/v7.1"
DATA_FILE = Path("data/cardio.json")

CLIENT_ID = os.getenv("MMF_CLIENT_ID", "").strip()
ACCESS_TOKEN = os.getenv("MMF_ACCESS_TOKEN", "").strip()
USER_ID = os.getenv("MMF_USER_ID", "").strip()


def die(msg):
    print(msg, file=sys.stderr)
    raise SystemExit(1)


def mmf_headers():
    return {
        "Api-Key": CLIENT_ID,
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Accept": "application/json",
    }


def fetch_workouts():
    url = f"{API_BASE}/workout/"
    params = {"user": USER_ID, "order_by": "-start_datetime", "limit": 100}
    r = requests.get(url, headers=mmf_headers(), params=params, timeout=30)
    if r.status_code == 401:
        die("MapMyFitness token non valido o scaduto. Aggiorna MMF_ACCESS_TOKEN.")
    r.raise_for_status()
    body = r.json()
    return body.get("_embedded", {}).get("workouts", [])


def get_link_id(w, name):
    links = w.get("_links", {}).get(name, [])
    return str(links[0].get("id")) if links else None


def pace_from(distance_km, duration_s):
    if not distance_km or not duration_s:
        return None
    sec_per_km = duration_s / distance_km
    mins = int(sec_per_km // 60)
    secs = int(round(sec_per_km % 60))
    if secs == 60:
        mins += 1; secs = 0
    return f"{mins}:{secs:02d}"


def normalize(w):
    agg = w.get("aggregates") or {}
    wid = get_link_id(w, "self")
    route_id = get_link_id(w, "route")
    activity_type_id = get_link_id(w, "activity_type")
    distance_km = round(float(agg.get("distance_total") or 0) / 1000, 3)
    duration_s = int(round(float(agg.get("active_time_total") or agg.get("elapsed_time_total") or 0)))
    speed_kmh = round(float(agg.get("speed_avg") or 0) * 3.6, 2) if agg.get("speed_avg") is not None else None
    energy_kcal = round(float(agg.get("metabolic_energy_total") or 0) / 4184) if agg.get("metabolic_energy_total") is not None else None
    start = w.get("start_datetime") or ""
    date = start[:10] if len(start) >= 10 else None
    return {
        "id": f"mapmyfitness:{wid}",
        "mapmyfitness_workout_id": wid,
        "date": date,
        "start_datetime": start or None,
        "type": "Corsa" if "run" in (w.get("name") or "").lower() else (w.get("name") or "Workout"),
        "distance_km": distance_km,
        "duration_seconds": duration_s,
        "pace": pace_from(distance_km, duration_s),
        "speed_kmh": speed_kmh,
        "energy_kcal": energy_kcal,
        "activity_type_id": activity_type_id,
        "route_id": route_id,
        "source": w.get("source_name") or w.get("source") or "MapMyRun",
        "note": w.get("notes") or None,
    }


def likely_same(a, b):
    if a.get("mapmyfitness_workout_id") or b.get("mapmyfitness_workout_id"):
        return False
    if a.get("date") != b.get("date"):
        return False
    da, db = a.get("distance_km") or 0, b.get("distance_km") or 0
    ta, tb = a.get("duration_seconds") or 0, b.get("duration_seconds") or 0
    return abs(da-db) <= 0.05 and abs(ta-tb) <= 90


def main():
    if not all([CLIENT_ID, ACCESS_TOKEN, USER_ID]):
        die("Servono i secret MMF_CLIENT_ID, MMF_ACCESS_TOKEN e MMF_USER_ID.")
    data = json.loads(DATA_FILE.read_text(encoding="utf-8")) if DATA_FILE.exists() else {"meta": {}, "activities": []}
    activities = data.setdefault("activities", [])
    by_id = {a.get("id"): a for a in activities}
    added = updated = merged = 0

    for raw in fetch_workouts():
        item = normalize(raw)
        if not item.get("mapmyfitness_workout_id"):
            continue
        if item["id"] in by_id:
            by_id[item["id"]].update({k:v for k,v in item.items() if v is not None})
            updated += 1
            continue
        manual = next((a for a in activities if likely_same(a, item)), None)
        if manual:
            old_id = manual.get("id")
            manual.update({k:v for k,v in item.items() if v is not None})
            manual["legacy_id"] = old_id
            merged += 1
        else:
            activities.append(item); added += 1

    activities.sort(key=lambda a: (a.get("date") or "", a.get("start_datetime") or ""), reverse=True)
    data.setdefault("meta", {})["updated"] = datetime.now(timezone.utc).date().isoformat()
    data["meta"]["sync_source"] = "MapMyRun / MapMyFitness API v7.1"
    DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"sync completata: {added} aggiunte, {updated} aggiornate, {merged} unite a record manuali")

if __name__ == "__main__":
    main()
