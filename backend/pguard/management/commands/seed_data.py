import random
from datetime import date, datetime, timedelta, timezone

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

from pguard.models import Alert, DailyKpi, DailyStat, Profile, Report, Robot
from pguard.seeds import info_seed, kpi_seed

# (period, format, days_ago) — same 4-entry seed pattern as the old frontend mock.
REPORT_SEEDS = [
    ('30d', 'pdf', 2),
    ('7d', 'csv', 9),
    ('custom', 'pdf', 24),
    ('30d', 'csv', 38),
]

# type, severity, description, desc_key — ported from the frontend mock's ALERT_KINDS,
# same event catalogue so the Alertes page reads like a real ops log.
ALERT_KINDS = [
    ('system', 'info', 'Mise à jour du firmware appliquée', 'alert.desc.firmware'),
    ('system', 'info', 'Redémarrage normal du système', 'alert.desc.reboot'),
    ('obstacle', 'info', 'Piéton détecté — ralentissement temporaire', 'alert.desc.pedestrian'),
    ('obstacle', 'warning', 'Obstacle imprévu — contournement effectué', 'alert.desc.obstacleWarning'),
    ('system', 'warning', 'Perte temporaire du signal GPS', 'alert.desc.gpsLoss'),
    ('docking_failed', 'warning', 'Échec de docking — récupéré automatiquement', 'alert.desc.dockingWarning'),
    ('emergency_stop', 'critical', "Arrêt d'urgence déclenché — ronde interrompue", 'alert.desc.estop'),
    ('docking_failed', 'critical', 'Échec de docking — intervention manuelle requise', 'alert.desc.dockingCritical'),
    ('obstacle', 'critical', "Collision évitée — freinage d'urgence", 'alert.desc.collision'),
]
NOW_DT = datetime(2026, 6, 1, 20, 0, 0, tzinfo=timezone.utc)

ROBOTS = [
    dict(id='PG-001', name='Robot 01', site='Sousse (TN) → Bietigheim (DE)', region='germany',
         state='running', current_mission='Ronde nocturne — Secteur B', battery=71, commissioned_at='2024-06-01'),
    dict(id='PG-002', name='Robot 02', site='Monastir (TN)', region='tunisia',
         state='charging', current_mission=None, battery=48, commissioned_at='2024-09-12'),
    dict(id='PG-003', name='Robot 03', site='Bietigheim (DE)', region='germany',
         state='docked', current_mission=None, battery=93, commissioned_at='2025-02-03'),
    dict(id='PG-004', name='Robot 04', site='Sousse (TN)', region='tunisia',
         state='maintenance', current_mission=None, battery=22, commissioned_at='2025-05-20'),
]

USERS = [
    dict(email='ops@enova.local', name='Centre Opérations', role='superadmin', robots=['PG-001', 'PG-002', 'PG-003', 'PG-004']),
    dict(email='admin@enova.local', name='Admin Enova', role='admin', robots=['PG-001', 'PG-002']),
    dict(email='client@site.tn', name='Client Site', role='client', robots=['PG-001']),
]

SPAN_START = date(2024, 6, 1)
NOW = date(2026, 6, 1)

SITES = [
    ('Sousse', 'tunisia'), ('Monastir', 'tunisia'), ('Sfax', 'tunisia'), ('Tunis', 'tunisia'),
    ('Bietigheim', 'germany'), ('Stuttgart', 'germany'), ('Karlsruhe', 'germany'), ('Munich', 'germany'),
]
STATES = ['running', 'charging', 'docked', 'maintenance', 'offline']


def _gen_robot(n, rng):
    """One fictional robot for fleet padding — same shape as the fixed ROBOTS above."""
    city, region = rng.choice(SITES)
    commissioned = SPAN_START + timedelta(days=rng.randint(0, (NOW - SPAN_START).days - 30))
    state = rng.choice(STATES)
    return dict(
        id=f'PG-{n:03d}',
        name=f'Robot {n:02d}',
        site=f'{city} ({"DE" if region == "germany" else "TN"})',
        region=region,
        state=state,
        current_mission='Ronde — Secteur A' if state == 'running' else None,
        battery=rng.randint(15, 100),
        commissioned_at=commissioned.isoformat(),
    )


class Command(BaseCommand):
    help = 'Seed demo robots, users, and dashboard daily stats from the log-derived JSON seeds.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--extra', type=int, default=0,
            help='Generate N additional fictional robots (PG-005, PG-006, ...) beyond the fixed 4.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        robots = list(ROBOTS)
        extra = options['extra']
        if extra:
            rng = random.Random('fleet-extra')  # deterministic: same --extra N always yields the same fleet
            robots += [_gen_robot(n, rng) for n in range(5, 5 + extra)]

        for r in robots:
            Robot.objects.update_or_create(id=r['id'], defaults={k: v for k, v in r.items() if k != 'id'})
        self.stdout.write(f'Seeded {len(robots)} robots.')

        for u in USERS:
            user, _ = User.objects.update_or_create(
                username=u['email'], defaults={'email': u['email'], 'first_name': u['name']},
            )
            user.set_password('demo')
            user.save()
            profile, _ = Profile.objects.update_or_create(user=user, defaults={'role': u['role']})
            profile.assigned_robots.set(Robot.objects.filter(id__in=u['robots']))
        self.stdout.write(f'Seeded {len(USERS)} users (password: demo).')

        DailyStat.objects.all().delete()
        DailyKpi.objects.all().delete()
        self._seed_real_stats('PG-001')
        self._seed_real_kpis('PG-001')
        for r in robots[1:]:
            self._seed_synthetic_stats(r['id'])
            self._seed_synthetic_kpis(r['id'])
        self.stdout.write('Seeded daily stats and KPIs.')

        Alert.objects.all().delete()
        for r in robots:
            self._seed_alerts(r['id'])
        self.stdout.write('Seeded alerts.')

        Report.objects.all().delete()
        for r in robots:
            self._seed_reports(r['id'])
        self.stdout.write('Seeded report history.')

    def _seed_real_stats(self, robot_id):
        """PG-001: real per-day counts derived from patrol logs (info_seed.json)."""
        info = info_seed()
        rounds_by_date = {d['date']: d['rondes'] for d in info['composition']['daily']}
        charges_by_date = {d['date']: d['amarrages'] for d in info['composition']['daily']}
        obstacles_by_date = {d['date']: d['count'] for d in info['obstacles']['daily']}
        estops_by_date = {d['date']: d['returns'] - d['reached'] for d in info['back_home']['daily']}

        dates = set(rounds_by_date) | set(charges_by_date) | set(obstacles_by_date) | set(estops_by_date)
        robot = Robot.objects.get(id=robot_id)
        stats = [
            DailyStat(
                robot=robot,
                date=d,
                rounds=rounds_by_date.get(d, 0),
                incidents=obstacles_by_date.get(d, 0) + estops_by_date.get(d, 0),
                charges=charges_by_date.get(d, 0),
            )
            for d in dates
        ]
        DailyStat.objects.bulk_create(stats)

    def _seed_synthetic_stats(self, robot_id):
        # ponytail: fictional robots have no real logs — deterministic per-robot RNG
        # gives them plausible non-empty dashboards. Swap for real ingestion if these
        # units start reporting.
        rng = random.Random(robot_id)
        robot = Robot.objects.get(id=robot_id)
        total_days = (NOW - SPAN_START).days
        stats = []
        d = SPAN_START
        for _ in range(total_days):
            if rng.random() < 0.6:  # not every day has activity
                stats.append(DailyStat(
                    robot=robot,
                    date=d,
                    rounds=rng.randint(0, 6),
                    incidents=rng.randint(0, 2),
                    charges=rng.randint(0, 3),
                ))
            d += timedelta(days=1)
        DailyStat.objects.bulk_create(stats)

    def _seed_real_kpis(self, robot_id):
        """PG-001: real disponibilité/autonomie per day (kpi_seed.json)."""
        robot = Robot.objects.get(id=robot_id)
        kpis = [
            DailyKpi(robot=robot, date=d['date'], disponibilite=d['disponibilite'], autonomie=d['autonomie'])
            for d in kpi_seed()['daily']
        ]
        DailyKpi.objects.bulk_create(kpis)

    def _seed_synthetic_kpis(self, robot_id):
        # ponytail: same rationale as _seed_synthetic_stats — plausible non-empty
        # values for fictional robots, centered near the real fleet's ~90%/~90%.
        rng = random.Random(f'{robot_id}:kpi')
        robot = Robot.objects.get(id=robot_id)
        total_days = (NOW - SPAN_START).days
        kpis = []
        d = SPAN_START
        for _ in range(total_days):
            kpis.append(DailyKpi(
                robot=robot,
                date=d,
                disponibilite=round(85 + rng.random() * 13, 1),
                autonomie=round(80 + rng.random() * 17, 1),
            ))
            d += timedelta(days=1)
        DailyKpi.objects.bulk_create(kpis)

    def _seed_alerts(self, robot_id):
        # ~26 events spread back across the timeline, most-recent-first, cycling
        # through a shuffled event catalogue — mirrors the frontend mock's buildAlerts.
        rng = random.Random(f'{robot_id}:alerts')
        order = list(range(len(ALERT_KINDS)))
        rng.shuffle(order)

        robot = Robot.objects.get(id=robot_id)
        count = 26
        cursor = NOW_DT
        alerts = []
        for i in range(count):
            cursor -= timedelta(hours=2 + rng.random() * 84)
            kind_type, severity, description, desc_key = ALERT_KINDS[order[i % len(order)]]
            alerts.append(Alert(
                id=f'{robot_id}-AL-{i}',
                robot=robot,
                type=kind_type,
                severity=severity,
                occurred_at=cursor,
                mission_id=f'M-{1000 + int(rng.random() * 9000)}' if rng.random() > 0.4 else None,
                description=description,
                desc_key=desc_key,
                media_url=None,
                acknowledged=False,
            ))
        Alert.objects.bulk_create(alerts)

    def _seed_reports(self, robot_id):
        rng = random.Random(f'{robot_id}:reports')
        robot = Robot.objects.get(id=robot_id)
        reports = [
            Report(
                id=f'{robot_id}-R-{i}',
                robot=robot,
                period=period,
                format=fmt,
                generated_at=NOW_DT - timedelta(days=days_ago),
                size_kb=40 + int(rng.random() * 220),
            )
            for i, (period, fmt, days_ago) in enumerate(REPORT_SEEDS)
        ]
        Report.objects.bulk_create(reports)
