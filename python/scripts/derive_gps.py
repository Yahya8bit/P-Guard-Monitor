#!/usr/bin/env python3
"""
Extract patrol-path tracks from P-Guard Mission logs for the "Trajet de patrouille" map.

Source: Mission/Mission-<date>.json  (one file per day, may hold several rounds)
Record key layout shifts by 0-Info — branch on it, never read by position:
    start : 7-Latitude / 8-Longitude   (breadcrumb along the route)
    end   : 6-Latitude / 7-Longitude   (one per completed round)
    pause : 6-Latitude / 7-Longitude

Cleaning:
  - drop NaN coords
  - drop the GPS no-fix sentinel (~32.86, -96.88, Dallas TX) and anything outside the
    two known deployment regions (Tunisia Sousse/Monastir, Germany Stuttgart)
  - tag each track with its deployment so the map can fit-bounds per region/period
Output: one ordered polyline per (date, mission), grouped so the map never draws a
stray line between two separate rounds.
"""
import glob, json, math, collections

MISSION_GLOB = "mission_raw/Mission/*.json"
OUT = "gps_seed.json"

# deployment region boxes (lat_min, lat_max, lng_min, lng_max)
REGIONS = {
    "TN": (34.0, 37.0, 9.0, 12.0),    # Sousse / Monastir
    "DE": (47.0, 50.0, 8.0, 11.0),    # Stuttgart area
}

def latlng(r):
    i = r.get("0-Info")
    if i == "start":
        return r.get("7-Latitude"), r.get("8-Longitude")
    if i in ("end", "pause"):
        return r.get("6-Latitude"), r.get("7-Longitude")
    return None, None

def region_of(la, lo):
    for name, (a, b, c, d) in REGIONS.items():
        if a < la < b and c < lo < d:
            return name
    return None

def main():
    tracks = []
    kept = dropped_sentinel = dropped_nan = dropped_oob = 0
    for path in sorted(glob.glob(MISSION_GLOB)):
        try:
            data = json.load(open(path))
        except Exception:
            continue
        # preserve file order (chronological), split into rounds by mission name
        groups = collections.OrderedDict()
        for r in data:
            la, lo = latlng(r)
            if not isinstance(la, (int, float)) or not isinstance(lo, (int, float)):
                continue
            if isinstance(la, float) and math.isnan(la):
                dropped_nan += 1
                continue
            reg = region_of(la, lo)
            if reg is None:
                dropped_sentinel += 1
                continue
            kept += 1
            key = (r.get("2-Date"), r.get("1-Mission_name"))
            groups.setdefault(key, {"reg": reg, "pts": []})
            groups[key]["pts"].append([round(la, 6), round(lo, 6)])
        for (date, mission), g in groups.items():
            if len(g["pts"]) < 2:        # need >=2 points to draw a line
                continue
            tracks.append({
                "date": date,
                "mission": mission,
                "deployment": g["reg"],
                "points": g["pts"],
            })

    # per-deployment bounding box for fit-bounds
    bounds = {}
    for t in tracks:
        d = t["deployment"]
        for la, lo in t["points"]:
            b = bounds.setdefault(d, [la, la, lo, lo])
            b[0] = min(b[0], la); b[1] = max(b[1], la)
            b[2] = min(b[2], lo); b[3] = max(b[3], lo)
    bounds = {k: {"lat_min": v[0], "lat_max": v[1], "lng_min": v[2], "lng_max": v[3]}
              for k, v in bounds.items()}

    out = {
        "deployments": sorted(bounds.keys()),
        "bounds": bounds,
        "track_count": len(tracks),
        "point_count": sum(len(t["points"]) for t in tracks),
        "cleaning": {
            "dropped_nan": dropped_nan,
            "dropped_out_of_region_or_sentinel": dropped_sentinel,
        },
        "tracks": tracks,
    }
    json.dump(out, open(OUT, "w"), indent=2)
    by_dep = collections.Counter(t["deployment"] for t in tracks)
    print(f"tracks: {len(tracks)}  points kept: {out['point_count']}")
    print(f"by deployment: {dict(by_dep)}")
    print(f"dropped: {dropped_sentinel} out-of-region/sentinel, {dropped_nan} NaN")
    print(f"bounds: {bounds}")
    print(f"wrote {OUT}")

if __name__ == "__main__":
    main()
