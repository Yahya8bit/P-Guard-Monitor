#!/usr/bin/env python3
"""
Derive Info/ log statistics: docking procedures, obstacle delays, back_home outcomes,
and operations composition.

Usage:
    python scripts/derive_info.py /path/to/Info/

Output:
    src/services/data/info_seed.json  (relative to repo root)

Date rule: always derive date from FILENAME (YYYY-M-D.json, variable zero-padding),
           never from the unreliable 2-Date field.
Schema rule: always branch on 0-Info (and 1-State for docking); never positional reads.
"""
import collections, glob, json, os, re, sys
from pathlib import Path

# ── helpers ───────────────────────────────────────────────────────────────────

_DATE_RE = re.compile(r'(\d{4})-(\d{1,2})-(\d{1,2})\.json$')

def date_from_path(path: str) -> str | None:
    """Return ISO YYYY-MM-DD from filename, or None if unparseable."""
    m = _DATE_RE.search(os.path.basename(path))
    if not m:
        return None
    y, mo, d = m.groups()
    return f"{int(y):04d}-{int(mo):02d}-{int(d):02d}"

def load_json(path: str):
    try:
        with open(path, encoding='utf-8', errors='replace') as f:
            return json.load(f)
    except Exception:
        return None

def _median(vals: list) -> float | None:
    if not vals:
        return None
    s = sorted(vals)
    n = len(s)
    mid = n // 2
    return float(s[mid] if n % 2 else (s[mid - 1] + s[mid]) / 2)

def _mean(vals: list) -> float | None:
    return round(sum(vals) / len(vals), 2) if vals else None

# ── 1. DOCKING ────────────────────────────────────────────────────────────────
#
# Only events with 0-Info=="docking" and 1-State carry procedure state.
# A procedure = from one 1-State=="start" to the next start (across all events
# in a file, in order). Succeeded if the procedure contains a "success" event.
# attempts_per_procedure = failed_count + 1 (the final attempt that
# succeeded or closed the procedure).

def derive_docking(info_dir: str) -> dict:
    files_read = files_skipped = 0
    procedures_total = procedures_succeeded = 0
    attempts_list: list[int] = []   # attempts per completed procedure
    battery_vals: list[int] = []
    daily: dict[str, dict] = collections.defaultdict(
        lambda: {'procedures': 0, 'succeeded': 0, 'failures': 0}
    )

    for path in sorted(glob.glob(os.path.join(info_dir, 'Docking', '*.json'))):
        date = date_from_path(path)
        if not date:
            files_skipped += 1
            continue
        events = load_json(path)
        if events is None:
            files_skipped += 1
            continue
        files_read += 1

        # walk only docking events (0-Info == "docking"); ignore start/undocking rows
        dock_events = [
            e for e in events
            if isinstance(e, dict) and e.get('0-Info') == 'docking'
        ]

        current: dict | None = None

        def _close(proc: dict, proc_date: str) -> None:
            nonlocal procedures_total, procedures_succeeded
            procedures_total += 1
            if proc['success']:
                procedures_succeeded += 1
                daily[proc_date]['succeeded'] += 1
            else:
                daily[proc_date]['failures'] += 1
            daily[proc_date]['procedures'] += 1
            attempts_list.append(proc['failed'] + 1)
            if proc['battery'] is not None:
                battery_vals.append(proc['battery'])

        for evt in dock_events:
            state = evt.get('1-State', '')
            batt = evt.get('4-Battery')

            if state == 'start':
                if current is not None:
                    _close(current, date)
                current = {'success': False, 'failed': 0, 'battery': batt, 'date': date}
            elif state == 'success':
                if current is not None:
                    current['success'] = True
            elif state == 'failed' or (isinstance(state, str) and state.startswith('restart')):
                if current is not None:
                    current['failed'] += 1

        if current is not None:
            _close(current, date)

    sr = round(100 * procedures_succeeded / procedures_total, 1) if procedures_total else None
    mean_att = round(sum(attempts_list) / len(attempts_list), 2) if attempts_list else None

    return {
        'procedures_total': procedures_total,
        'procedures_succeeded': procedures_succeeded,
        'success_rate': sr,
        'attempts_per_procedure_mean': mean_att,
        'battery_at_dock': {
            'mean': _mean(battery_vals),
            'median': _median(battery_vals),
            'n': len(battery_vals),
        },
        'daily': [
            {'date': d, 'procedures': v['procedures'],
             'succeeded': v['succeeded'], 'failures': v['failures']}
            for d, v in sorted(daily.items())
        ],
        '_quality': {
            'files_read': files_read,
            'files_skipped': files_skipped,
            'unparseable_events': 0,
        },
    }

# ── 2. OBSTACLE ───────────────────────────────────────────────────────────────
#
# Each event: 0-Date, 1-Hour, 2-Mission_name, 3-Last_point, 4-Delay (seconds, string).
# Date comes from filename.

def derive_obstacles(info_dir: str) -> dict:
    files_read = files_skipped = unparseable = 0
    delays: list[float] = []
    daily: dict[str, dict] = collections.defaultdict(
        lambda: {'count': 0, 'delay_s_total': 0.0}
    )

    for path in sorted(glob.glob(os.path.join(info_dir, 'Obstacle', '*.json'))):
        date = date_from_path(path)
        if not date:
            files_skipped += 1
            continue
        events = load_json(path)
        if events is None:
            files_skipped += 1
            continue
        files_read += 1

        for evt in events:
            if not isinstance(evt, dict):
                unparseable += 1
                continue
            raw = evt.get('4-Delay')
            if raw is None:
                unparseable += 1
                continue
            try:
                d = float(raw)
            except (ValueError, TypeError):
                unparseable += 1
                continue
            delays.append(d)
            daily[date]['count'] += 1
            daily[date]['delay_s_total'] += d

    return {
        'events_total': len(delays),
        'delay_s': {
            'mean': _mean(delays),
            'median': round(_median(delays), 2) if delays else None,
            'max': round(max(delays), 2) if delays else None,
            'total_min': round(sum(delays) / 60, 1),
        },
        'daily': [
            {'date': d, 'count': v['count'],
             'delay_s_total': round(v['delay_s_total'], 1)}
            for d, v in sorted(daily.items())
        ],
        '_quality': {
            'files_read': files_read,
            'files_skipped': files_skipped,
            'unparseable_events': unparseable,
        },
    }

# ── 3. BACK_HOME ──────────────────────────────────────────────────────────────
#
# end events: 0-Info=="end", 4-Notes in {Home_reached, Emergency_pressed}.

def derive_back_home(info_dir: str) -> dict:
    files_read = files_skipped = unparseable = 0
    returns_total = home_reached = emergency_pressed = 0
    daily: dict[str, dict] = collections.defaultdict(
        lambda: {'returns': 0, 'reached': 0}
    )

    for path in sorted(glob.glob(os.path.join(info_dir, 'Back_home', '*.json'))):
        date = date_from_path(path)
        if not date:
            files_skipped += 1
            continue
        events = load_json(path)
        if events is None:
            files_skipped += 1
            continue
        files_read += 1

        for evt in events:
            if not isinstance(evt, dict):
                unparseable += 1
                continue
            if evt.get('0-Info') != 'end':
                continue
            notes = evt.get('4-Notes', '')
            returns_total += 1
            daily[date]['returns'] += 1
            if notes == 'Home_reached':
                home_reached += 1
                daily[date]['reached'] += 1
            elif notes == 'Emergency_pressed':
                emergency_pressed += 1

    sr = round(100 * home_reached / returns_total, 1) if returns_total else None

    return {
        'returns_total': returns_total,
        'home_reached': home_reached,
        'emergency_pressed': emergency_pressed,
        'success_rate': sr,
        'daily': [
            {'date': d, 'returns': v['returns'], 'reached': v['reached']}
            for d, v in sorted(daily.items())
        ],
        '_quality': {
            'files_read': files_read,
            'files_skipped': files_skipped,
            'unparseable_events': unparseable,
        },
    }

# ── 4. COMPOSITION ────────────────────────────────────────────────────────────

def derive_composition(info_dir: str, docking_daily: list[dict]) -> dict:
    """Count operation events per category per day."""

    # rondes: Mission/*.json 0-Info == "end" (one per completed or interrupted round)
    rondes_total = 0
    rondes_daily: dict[str, int] = collections.defaultdict(int)
    for path in sorted(glob.glob(os.path.join(info_dir, 'Mission', '*.json'))):
        date = date_from_path(path)
        if not date:
            continue
        events = load_json(path)
        if not events:
            continue
        for evt in events:
            if isinstance(evt, dict) and evt.get('0-Info') == 'end':
                rondes_total += 1
                rondes_daily[date] += 1

    # amarrages: docking procedures (already computed)
    amarrages_total = sum(d['procedures'] for d in docking_daily)
    amarrages_by_date = {d['date']: d['procedures'] for d in docking_daily}

    # retours_station: Back_home 0-Info == "end"
    retours_total = 0
    retours_daily: dict[str, int] = collections.defaultdict(int)
    for path in sorted(glob.glob(os.path.join(info_dir, 'Back_home', '*.json'))):
        date = date_from_path(path)
        if not date:
            continue
        events = load_json(path)
        if not events:
            continue
        for evt in events:
            if isinstance(evt, dict) and evt.get('0-Info') == 'end':
                retours_total += 1
                retours_daily[date] += 1

    # inspections: Inspecting/*.json 0-Info == "start"
    inspections_total = 0
    inspections_daily: dict[str, int] = collections.defaultdict(int)
    for path in sorted(glob.glob(os.path.join(info_dir, 'Inspecting', '*.json'))):
        date = date_from_path(path)
        if not date:
            continue
        events = load_json(path)
        if not events:
            continue
        for evt in events:
            if isinstance(evt, dict) and evt.get('0-Info') == 'start':
                inspections_total += 1
                inspections_daily[date] += 1

    all_dates = sorted(
        set(rondes_daily) | set(amarrages_by_date) | set(retours_daily) | set(inspections_daily)
    )

    return {
        'totals': {
            'rondes': rondes_total,
            'amarrages': amarrages_total,
            'retours_station': retours_total,
            'inspections': inspections_total,
        },
        'daily': [
            {
                'date': d,
                'rondes': rondes_daily.get(d, 0),
                'amarrages': amarrages_by_date.get(d, 0),
                'retours_station': retours_daily.get(d, 0),
                'inspections': inspections_daily.get(d, 0),
            }
            for d in all_dates
        ],
    }

# ── main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python scripts/derive_info.py /path/to/Info/")
        sys.exit(1)

    info_dir = sys.argv[1]
    if not os.path.isdir(info_dir):
        print(f"Error: {info_dir} is not a directory", file=sys.stderr)
        sys.exit(1)

    print("Processing Docking …")
    docking = derive_docking(info_dir)
    bd = docking['battery_at_dock']
    print(
        f"  procedures={docking['procedures_total']}  "
        f"succeeded={docking['procedures_succeeded']}  "
        f"success_rate={docking['success_rate']}%  "
        f"attempts_mean={docking['attempts_per_procedure_mean']}  "
        f"battery_median={bd['median']}  battery_n={bd['n']}"
    )

    print("Processing Obstacles …")
    obstacles = derive_obstacles(info_dir)
    ds = obstacles['delay_s']
    print(
        f"  events={obstacles['events_total']}  "
        f"delay_mean={ds['mean']}s  delay_median={ds['median']}s  "
        f"delay_max={ds['max']}s  total_min={ds['total_min']}"
    )

    print("Processing Back_home …")
    back_home = derive_back_home(info_dir)
    print(
        f"  returns={back_home['returns_total']}  "
        f"reached={back_home['home_reached']}  "
        f"emergency={back_home['emergency_pressed']}  "
        f"success_rate={back_home['success_rate']}%"
    )

    print("Computing composition …")
    composition = derive_composition(info_dir, docking['daily'])
    t = composition['totals']
    print(
        f"  rondes={t['rondes']}  amarrages={t['amarrages']}  "
        f"retours_station={t['retours_station']}  inspections={t['inspections']}"
    )

    # strip internal quality keys before building output
    dq = {
        'docking': docking.pop('_quality'),
        'obstacles': obstacles.pop('_quality'),
        'back_home': back_home.pop('_quality'),
    }

    out = {
        'method': {
            'date_source': 'filename (Category-YYYY-M-D.json) → ISO YYYY-MM-DD; 2-Date field ignored',
            'docking_procedure': (
                'events with 0-Info==docking; procedure = from one 1-State==start to the next; '
                'succeeded if contains 1-State==success; '
                'attempts = failed_count + 1'
            ),
            'obstacle_delay': '4-Delay (seconds, string→float) per obstacle event',
            'back_home_outcome': '0-Info==end events; 4-Notes in {Home_reached, Emergency_pressed}',
            'composition': (
                'rondes=Mission 0-Info==end, amarrages=docking procedures, '
                'retours_station=Back_home 0-Info==end, inspections=Inspecting 0-Info==start'
            ),
        },
        'docking': docking,
        'obstacles': obstacles,
        'back_home': back_home,
        'composition': composition,
        'data_quality': dq,
    }

    out_path = Path(__file__).parent.parent / 'src' / 'services' / 'data' / 'info_seed.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=2)
    print(f"\nWrote {out_path}")


if __name__ == '__main__':
    main()
