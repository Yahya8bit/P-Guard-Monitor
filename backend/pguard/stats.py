"""Derivations for the trend/battery/statistics/info-stats endpoints.

PG-001 is the real unit — sections sourced from info_seed/kpi_seed.json are real
log-derived numbers. Distance-per-round and round duration have no real source
(the original frontend mock fabricated these too, just scaled to match real
lifetime totals for PG-001), so they're deterministic per-robot estimates here.
Other robots are synthetic throughout (see management/commands/seed_data.py).
"""
import random
from datetime import date, timedelta

from .seeds import REAL_ROBOT_ID, gps_seed, info_seed, kpi_seed

NOW = date(2026, 6, 1)
PERIOD_DAYS = {'7d': 7, '30d': 30, 'custom': 30}

# 350 km lifetime over 969 real rounds (CLAUDE.md) -> per-round distance estimate.
KM_PER_ROUND = 350 / 969
METRIC_FIELD = {'rounds': 'rounds', 'incidents': 'incidents', 'charges': 'charges'}


def _rows(robot, days):
    cutoff = NOW - timedelta(days=days)
    return list(robot.daily_stats.filter(date__gt=cutoff, date__lte=NOW))


def get_trend(robot, period, metric):
    days = PERIOD_DAYS.get(period, 30)
    cutoff = NOW - timedelta(days=days)
    if metric == 'disponibilite':
        kpis = robot.daily_kpis.filter(date__gt=cutoff, date__lte=NOW)
        points = [{'t': k.date.isoformat(), 'value': k.disponibilite} for k in kpis]
    else:
        field = METRIC_FIELD[metric]
        points = [{'t': r.date.isoformat(), 'value': getattr(r, field)} for r in _rows(robot, days)]
    return {'metric': metric, 'granularity': 'daily', 'points': points}


def get_battery_samples(robot, period):
    days = PERIOD_DAYS.get(period, 30)
    rng = random.Random(f'{robot.id}:battery')
    out = []
    for row in _rows(robot, days):
        if row.charges == 0:
            continue
        undock = round(82 + rng.random() * 18)
        drop = round(20 + rng.random() * 55)
        dock = max(9, undock - drop)
        out.append({'t': f'{row.date.isoformat()}T07:30:00Z', 'pct': min(100, undock), 'phase': 'undock'})
        out.append({'t': f'{row.date.isoformat()}T19:30:00Z', 'pct': dock, 'phase': 'dock'})
    return out


def get_incident_breakdown(robot, period):
    days = PERIOD_DAYS.get(period, 30)
    if robot.id == REAL_ROBOT_ID:
        cutoff = (NOW - timedelta(days=days)).isoformat()
        info = info_seed()
        obstacles = sum(d['count'] for d in info['obstacles']['daily'] if d['date'] >= cutoff)
        estops = sum(d['returns'] - d['reached'] for d in info['back_home']['daily'] if d['date'] >= cutoff)
        return {'obstacles': obstacles, 'emergencyStops': estops, 'total': obstacles + estops}
    total = sum(r.incidents for r in _rows(robot, days))
    estops = round(total / 3)
    return {'obstacles': total - estops, 'emergencyStops': estops, 'total': total}


def get_info_stats(robot, days):
    if robot.id != REAL_ROBOT_ID:
        return None
    info = info_seed()
    cutoff = (NOW - timedelta(days=days)).isoformat()

    dock_slice = [d for d in info['docking']['daily'] if d['date'] >= cutoff]
    dock_total = sum(d['procedures'] for d in dock_slice)
    dock_succ = sum(d['succeeded'] for d in dock_slice)

    obs_slice = [d for d in info['obstacles']['daily'] if d['date'] >= cutoff]
    obs_total = sum(d['count'] for d in obs_slice)
    obs_delay_total = sum(d['delay_s_total'] for d in obs_slice)

    bh_slice = [d for d in info['back_home']['daily'] if d['date'] >= cutoff]
    bh_total = sum(d['returns'] for d in bh_slice)
    bh_reached = sum(d['reached'] for d in bh_slice)

    return {
        'docking': {
            'procedures_total': dock_total,
            'procedures_succeeded': dock_succ,
            'procedures_failed': dock_total - dock_succ,
            'success_rate': info['docking']['success_rate'],
            'attempts_per_procedure_mean': info['docking']['attempts_per_procedure_mean'],
            'battery_at_dock_median': info['docking']['battery_at_dock']['median'],
            'daily': [{'label': d['date'][5:], 'succeeded': d['succeeded'], 'failed': d['failures']} for d in dock_slice],
        },
        'obstacles': {
            'events_total': info['obstacles']['events_total'],
            'delay_s_mean': info['obstacles']['delay_s']['mean'],
        },
        'obstaclesPeriod': {
            'events_total': obs_total,
            'delay_s_mean': (obs_delay_total / obs_total) if obs_total else 0,
        },
        'back_home': {
            'returns_total': bh_total,
            'home_reached': bh_reached,
            'not_reached': bh_total - bh_reached,
            'success_rate': info['back_home']['success_rate'],
            'daily': [{'label': d['date'][5:], 'reached': d['reached'], 'not_reached': d['returns'] - d['reached']} for d in bh_slice],
        },
    }


def get_last_known_track(robot):
    if robot.id != REAL_ROBOT_ID:
        return None
    tracks = sorted(gps_seed()['tracks'], key=lambda t: t['date'])
    if not tracks or not tracks[-1]['points']:
        return None
    last = tracks[-1]
    return {'date': last['date'], 'mission': last['mission'], 'points': last['points'], 'lastPoint': last['points'][-1]}


def get_patrol_tracks(robot_id, deployment, from_date, to_date):
    if robot_id and robot_id != REAL_ROBOT_ID:
        return []
    tracks = gps_seed()['tracks']
    return [
        t for t in tracks
        if (not deployment or t['deployment'] == deployment)
        and (not from_date or t['date'] >= from_date)
        and (not to_date or t['date'] <= to_date)
    ]


def _bucket(dates, gran):
    """Group date strings into (label, indices) buckets by granularity."""
    if gran == 'monthly':
        buckets = {}
        for i, d in enumerate(dates):
            buckets.setdefault(d[:7], []).append(i)
        return list(buckets.items())
    if gran == 'weekly':
        out = []
        for i in range(0, len(dates), 7):
            idxs = list(range(i, min(i + 7, len(dates))))
            out.append((f'sem. {dates[i][5:]}', idxs))
        return out
    return [(d[5:], [i]) for i, d in enumerate(dates)]


def _hourly_activity(robot, rows):
    rng = random.Random(f'{robot.id}:hours')
    matrix = [[0] * 24 for _ in range(7)]
    for r in rows:
        dow = (r.date.weekday())  # Monday=0..Sunday=6, matches mock's Mon=0 convention
        for _ in range(r.rounds):
            if rng.random() < 0.7:
                hour = (18 + int(rng.random() * 12)) % 24
            else:
                hour = 6 + int(rng.random() * 12)
            matrix[dow][hour] += 1
    return {'matrix': matrix, 'max': max(1, max((v for row in matrix for v in row), default=0))}


def get_statistics(robot, days, gran):
    rows = _rows(robot, days)
    dates = [r.date.isoformat() for r in rows]
    buckets = _bucket(dates, gran)

    rounds_success = [
        {'label': label, 'completed': sum(rows[i].rounds for i in idxs), 'interrupted': sum(rows[i].incidents for i in idxs)}
        for label, idxs in buckets
    ]
    emergency = [{'label': label, 'value': sum(rows[i].incidents for i in idxs)} for label, idxs in buckets]
    distance = [
        {'label': label, 'value': round(sum(rows[i].rounds for i in idxs) * KM_PER_ROUND, 1)}
        for label, idxs in buckets
    ]

    completed = sum(r.rounds for r in rows)
    interrupted = sum(r.incidents for r in rows)
    total = completed + interrupted
    docking_succ = sum(r.charges for r in rows)
    docking_fail = round(docking_succ * 0.06)
    docking_total = docking_succ + docking_fail
    distance_km = round(sum(d['value'] for d in distance))

    rng = random.Random(f'{robot.id}:dur')
    avg_round_min = 55 + int(rng.random() * 25)

    if robot.id == REAL_ROBOT_ID:
        # kpi_seed daily[] is only a 90-day sample; "overall" is the real full-history figure.
        overall = kpi_seed()['overall']
        overall_dispo, overall_auto = overall['disponibilite'], overall['autonomie']
    else:
        kpis = list(robot.daily_kpis.all())
        overall_dispo = sum(k.disponibilite for k in kpis) / len(kpis) if kpis else 0
        overall_auto = sum(k.autonomie for k in kpis) / len(kpis) if kpis else 0
    kpi_by_date = {k.date.isoformat(): k for k in robot.daily_kpis.all()}

    def _trend(field):
        out = []
        for label, idxs in buckets:
            vals = [getattr(kpi_by_date[dates[i]], field) for i in idxs if dates[i] in kpi_by_date]
            avg = (sum(vals) / len(vals)) if vals else 0
            out.append({'label': label, 'value': round(avg, 1)})
        return out

    return {
        'summary': {
            'missionRate': round(completed / total * 100) if total else 0,
            'completed': completed,
            'total': total,
            'emergencyStops': interrupted,
            'dockingRate': round(docking_succ / docking_total * 100) if docking_total else 0,
            'dockingSucc': docking_succ,
            'dockingTotal': docking_total,
            'distanceKm': distance_km,
            'avgRoundMin': avg_round_min,
            'disponibilite': round(overall_dispo, 1),
            'autonomie': round(overall_auto, 1),
        },
        'roundsSuccess': rounds_success,
        'emergency': emergency,
        'distance': distance,
        'dispoTrend': _trend('disponibilite'),
        'autonomieTrend': _trend('autonomie'),
        'hourly': _hourly_activity(robot, rows),
    }
