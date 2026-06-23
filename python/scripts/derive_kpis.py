#!/usr/bin/env python3
"""
Derive Disponibilité and Taux d'autonomie from the P-Guard report/ state-machine logs.

Source of truth: report/<YYYY-MM>/report_<YYYY-MM-DD>.log
Line format:  TS [trigger] STATE : <state>| MISSION : <m> | DISTANCE_TRAVELLED : <d>

Method (operational availability, gaps excluded):
  - parse each daily log into (timestamp, state) transitions
  - duration of a state = time until the next transition
  - cap each interval at ACTIVE_CAP_S: time beyond the cap is "parked/off", not operating
    (median tick during operation ~9s, p95 ~42s, p99 ~11min, so a 5-min cap keeps all
     genuine operation and drops the parked tail)
  - Disponibilité = up / active_total           up = active_total - downtime
  - Taux d'autonomie = autonomous / up          autonomous = up - teleop
"""
import glob, re, json, collections
from datetime import datetime

ACTIVE_CAP_S = 300                       # 5-minute operating-time boundary (locked)
LOG_GLOB = "report_raw/report/*/*.log"
OUT = "kpi_seed.json"

DOWN    = {"EmergencyStop", "EmergncyStop"}                 # typo normalized into here
TELEOP  = {"XboxTeleop", "AxisTeleop", "RemoteTeleop"}
# every other state counts as autonomous operating time

LINE = re.compile(r"^(\d{4}-\d{2}-\d{2} [\d:.]+) \[(.*?)\] STATE : (.*?)\| MISSION")
DATE = re.compile(r"report_(\d{4}-\d{2}-\d{2})\.log$")

def parse_ts(s):
    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S.%f")

def day_buckets(path):
    """Return capped seconds per bucket for one daily log, or None if unusable."""
    evs = []
    skipped = 0
    for line in open(path, encoding="utf-8", errors="replace"):
        m = LINE.match(line.rstrip("\n"))
        if not m:
            if line.strip():
                skipped += 1
            continue
        try:
            evs.append((parse_ts(m.group(1)), m.group(3).strip()))
        except ValueError:
            skipped += 1
    evs.sort(key=lambda x: x[0])
    if len(evs) < 2:
        return None, skipped
    down = teleop = active = 0.0
    for i in range(len(evs) - 1):                 # trailing open interval dropped
        d = (evs[i + 1][0] - evs[i][0]).total_seconds()
        if d < 0:
            continue
        d = min(d, ACTIVE_CAP_S)
        st = evs[i][1]
        active += d
        if st in DOWN:
            down += d
        elif st in TELEOP:
            teleop += d
    return {"active": active, "down": down, "teleop": teleop}, skipped

def kpis(active, down, teleop):
    if active <= 0:
        return None, None
    up = active - down
    autonomous = up - teleop
    dispo = 100 * up / active
    auto = 100 * autonomous / up if up > 0 else None
    return round(dispo, 1), (round(auto, 1) if auto is not None else None)

def main():
    daily = []
    tot = collections.Counter()
    total_skipped = 0
    empty_days = 0
    for path in sorted(glob.glob(LOG_GLOB)):
        b, skipped = day_buckets(path)
        total_skipped += skipped
        dm = DATE.search(path)
        date = dm.group(1) if dm else path
        if b is None:
            empty_days += 1
            continue
        for k in ("active", "down", "teleop"):
            tot[k] += b[k]
        dispo, auto = kpis(b["active"], b["down"], b["teleop"])
        daily.append({
            "date": date,
            "disponibilite": dispo,
            "autonomie": auto,
            "active_min": round(b["active"] / 60, 1),
        })

    odispo, oauto = kpis(tot["active"], tot["down"], tot["teleop"])
    out = {
        "method": {
            "source": "report/ state machine",
            "active_cap_seconds": ACTIVE_CAP_S,
            "downtime_states": sorted(DOWN),
            "teleop_states": sorted(TELEOP),
            "disponibilite": "up / active_total, up = active - downtime",
            "autonomie": "autonomous / up, autonomous = up - teleop",
        },
        "overall": {
            "disponibilite": odispo,
            "autonomie": oauto,
            "active_hours": round(tot["active"] / 3600, 1),
            "downtime_hours": round(tot["down"] / 3600, 1),
            "teleop_hours": round(tot["teleop"] / 3600, 1),
            "days": len(daily),
        },
        "daily": daily,
        "data_quality": {
            "empty_or_single_event_days_skipped": empty_days,
            "unparseable_lines_skipped": total_skipped,
            "normalized_states": {"EmergncyStop": "EmergencyStop"},
        },
    }
    json.dump(out, open(OUT, "w"), indent=2)
    print(f"Disponibilité = {odispo}%   Autonomie = {oauto}%")
    print(f"active {out['overall']['active_hours']}h  down {out['overall']['downtime_hours']}h  "
          f"teleop {out['overall']['teleop_hours']}h  over {len(daily)} days")
    print(f"skipped: {empty_days} empty days, {total_skipped} unparseable lines")
    print(f"wrote {OUT}")

if __name__ == "__main__":
    main()
