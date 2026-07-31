from django.conf import settings
from django.db import models


class Robot(models.Model):
    REGIONS = [('tunisia', 'tunisia'), ('germany', 'germany')]
    STATES = [
        ('running', 'running'),
        ('charging', 'charging'),
        ('docked', 'docked'),
        ('maintenance', 'maintenance'),
        ('offline', 'offline'),
    ]

    id = models.CharField(max_length=20, primary_key=True)  # e.g. "PG-001"
    name = models.CharField(max_length=100)
    site = models.CharField(max_length=200)
    region = models.CharField(max_length=20, choices=REGIONS)
    state = models.CharField(max_length=20, choices=STATES)
    current_mission = models.CharField(max_length=200, null=True, blank=True)
    battery = models.PositiveSmallIntegerField()
    commissioned_at = models.DateField()

    def __str__(self):
        return self.id


class Profile(models.Model):
    ROLES = [('superadmin', 'superadmin'), ('admin', 'admin'), ('client', 'client')]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLES)
    assigned_robots = models.ManyToManyField(Robot, blank=True, related_name='assigned_users')
    email_notifications = models.BooleanField(default=True)

    def __str__(self):
        return f'{self.user.email} ({self.role})'


class DailyStat(models.Model):
    """One row per robot per day: rounds completed, incident proxy, charge cycles.

    PG-001 is loaded from info_seed.json (real patrol logs); other robots get a
    deterministic synthetic series (seed_data command) so their dashboards aren't empty.
    """

    robot = models.ForeignKey(Robot, on_delete=models.CASCADE, related_name='daily_stats')
    date = models.DateField()
    rounds = models.PositiveIntegerField(default=0)
    incidents = models.PositiveIntegerField(default=0)
    charges = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('robot', 'date')
        ordering = ['date']


class Alert(models.Model):
    TYPES = [
        ('obstacle', 'obstacle'),
        ('emergency_stop', 'emergency_stop'),
        ('docking_failed', 'docking_failed'),
        ('system', 'system'),
    ]
    SEVERITIES = [('info', 'info'), ('warning', 'warning'), ('critical', 'critical')]

    id = models.CharField(max_length=40, primary_key=True)  # e.g. "PG-001-AL-0"
    robot = models.ForeignKey(Robot, on_delete=models.CASCADE, related_name='alerts')
    type = models.CharField(max_length=20, choices=TYPES)
    severity = models.CharField(max_length=10, choices=SEVERITIES)
    occurred_at = models.DateTimeField()
    mission_id = models.CharField(max_length=20, null=True, blank=True)
    description = models.CharField(max_length=200)
    desc_key = models.CharField(max_length=60, null=True, blank=True)
    media_url = models.CharField(max_length=200, null=True, blank=True)
    acknowledged = models.BooleanField(default=False)

    class Meta:
        ordering = ['-occurred_at']


class AlertResolution(models.Model):
    STATUSES = [('resolved', 'resolved'), ('unresolved', 'unresolved')]

    alert = models.OneToOneField(Alert, on_delete=models.CASCADE, related_name='resolution')
    status = models.CharField(max_length=10, choices=STATUSES)
    note = models.TextField()
    resolved_by = models.CharField(max_length=100)
    resolved_at = models.DateTimeField(auto_now=True)


class Report(models.Model):
    """Seeded report history entries (Rapports page). Generation itself is
    client-side (jsPDF/CSV, see frontend/src/lib/report.ts) — this is just the
    "past reports" list; new/deleted entries are session-local on the page."""
    PERIODS = [('7d', '7d'), ('30d', '30d'), ('custom', 'custom')]
    FORMATS = [('pdf', 'pdf'), ('csv', 'csv')]

    id = models.CharField(max_length=40, primary_key=True)  # e.g. "PG-001-R-0"
    robot = models.ForeignKey(Robot, on_delete=models.CASCADE, related_name='reports')
    period = models.CharField(max_length=10, choices=PERIODS)
    format = models.CharField(max_length=10, choices=FORMATS)
    generated_at = models.DateTimeField()
    size_kb = models.PositiveIntegerField()

    class Meta:
        ordering = ['-generated_at']


class DailyKpi(models.Model):
    """Disponibilité / taux d'autonomie per robot per day.

    PG-001: real values from kpi_seed.json. Other robots: deterministic synthetic.
    """

    robot = models.ForeignKey(Robot, on_delete=models.CASCADE, related_name='daily_kpis')
    date = models.DateField()
    disponibilite = models.FloatField()
    autonomie = models.FloatField()

    class Meta:
        unique_together = ('robot', 'date')
        ordering = ['date']
