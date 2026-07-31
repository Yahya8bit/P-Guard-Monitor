from datetime import date, timedelta

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from . import stats
from .models import Alert, AlertResolution, Robot
from .serializers import RobotSerializer
from .seeds import REAL_ROBOT_ID, kpi_seed

# Frozen "now" matching the frontend mock clock (see frontend mock.ts NOW).
NOW = date(2026, 6, 1)
PERIOD_DAYS = {'7d': 7, '30d': 30, 'custom': 30}


def _user_payload(user):
    profile = user.profile
    return {
        'id': str(user.id),
        'name': user.get_full_name() or user.username,
        'email': user.email,
        'role': profile.role,
        'assignedRobotIds': list(profile.assigned_robots.values_list('id', flat=True)),
    }


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password') or ''
        user = authenticate(request, username=email, password=password)
        if user is None:
            return Response({'detail': 'Identifiants invalides'}, status=401)
        refresh = RefreshToken.for_user(user)
        return Response({'access': str(refresh.access_token), 'refresh': str(refresh), 'user': _user_payload(user)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(_user_payload(request.user))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    current = request.data.get('currentPassword') or ''
    new = request.data.get('newPassword') or ''
    if not request.user.check_password(current):
        return Response({'detail': 'Mot de passe actuel incorrect'}, status=400)
    try:
        validate_password(new, user=request.user)  # AUTH_PASSWORD_VALIDATORS in settings.py
    except ValidationError as e:
        return Response({'detail': ' '.join(e.messages)}, status=400)
    request.user.set_password(new)
    request.user.save()
    return Response({'detail': 'ok'})


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def notification_prefs(request):
    profile = request.user.profile
    if request.method == 'PATCH':
        profile.email_notifications = bool(request.data.get('enabled'))
        profile.save()
    return Response({'enabled': profile.email_notifications})


def _visible_robots(user):
    profile = user.profile
    if profile.role == 'superadmin':
        return Robot.objects.all()
    return profile.assigned_robots.all()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_robots(request):
    robots = _visible_robots(request.user).order_by('id')
    return Response(RobotSerializer(robots, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_robot(request, robot_id):
    robot = _visible_robots(request.user).filter(id=robot_id).first()
    if robot is None:
        return Response({'detail': 'Not found'}, status=404)
    return Response(RobotSerializer(robot).data)


def _window_stats(robot, field, days):
    """Sum `field` over the last `days` days vs the `days` before that, for deltaPct."""
    cur_start = NOW - timedelta(days=days)
    prev_start = cur_start - timedelta(days=days)
    rows = list(robot.daily_stats.filter(date__gt=prev_start, date__lte=NOW).order_by('date'))
    cur = [getattr(s, field) for s in rows if s.date > cur_start]
    prev_sum = sum(getattr(s, field) for s in rows if s.date <= cur_start)
    cur_sum = sum(cur)
    if prev_sum == 0:
        delta_pct = 100 if cur_sum > 0 else 0
    else:
        delta_pct = round((cur_sum - prev_sum) / prev_sum * 100)
    return cur_sum, delta_pct, cur


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard(request, robot_id):
    robot = _visible_robots(request.user).filter(id=robot_id).first()
    if robot is None:
        return Response({'detail': 'Not found'}, status=404)

    period = request.query_params.get('period', '30d')
    days = PERIOD_DAYS.get(period, 30)

    rounds_sum, rounds_delta, rounds_win = _window_stats(robot, 'rounds', days)
    inc_sum, inc_delta, inc_win = _window_stats(robot, 'incidents', days)
    charges_sum, charges_delta, charges_win = _window_stats(robot, 'charges', days)

    # Disponibilité: PG-001 uses the real full-history figure (kpi_seed.json
    # "overall" — daily[] there is only a 90-day sample, not the full span).
    # Other robots average their synthetic DailyKpi rows. Lifetime, not windowed
    # — matches the frontend mock's behavior.
    if robot.id == REAL_ROBOT_ID:
        availability = round(kpi_seed()['overall']['disponibilite'])
    else:
        kpis = list(robot.daily_kpis.all())
        availability = round(sum(k.disponibilite for k in kpis) / len(kpis)) if kpis else 0

    return Response({
        'robotId': robot.id,
        'period': period,
        'status': {
            'state': robot.state,
            'currentMission': robot.current_mission,
            'battery': robot.battery,
            'lastSeen': f'{NOW.isoformat()}T20:00:00Z',
        },
        'kpis': {
            'rounds': {'value': rounds_sum, 'unit': 'count', 'deltaPct': rounds_delta, 'sparkline': rounds_win},
            'incidents': {'value': inc_sum, 'unit': 'count', 'deltaPct': inc_delta, 'sparkline': inc_win},
            'chargeCycles': {'value': charges_sum, 'unit': 'count', 'deltaPct': charges_delta, 'sparkline': charges_win},
            'availability': {'value': availability, 'unit': '%'},
        },
    })


def _get_robot_or_404(request, robot_id):
    return _visible_robots(request.user).filter(id=robot_id).first()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def trend(request, robot_id):
    robot = _get_robot_or_404(request, robot_id)
    if robot is None:
        return Response({'detail': 'Not found'}, status=404)
    period = request.query_params.get('period', '30d')
    metric = request.query_params.get('metric', 'rounds')
    return Response(stats.get_trend(robot, period, metric))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def battery(request, robot_id):
    robot = _get_robot_or_404(request, robot_id)
    if robot is None:
        return Response({'detail': 'Not found'}, status=404)
    return Response(stats.get_battery_samples(robot, request.query_params.get('period', '30d')))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def incident_breakdown(request, robot_id):
    robot = _get_robot_or_404(request, robot_id)
    if robot is None:
        return Response({'detail': 'Not found'}, status=404)
    return Response(stats.get_incident_breakdown(robot, request.query_params.get('period', '30d')))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def info_stats(request, robot_id):
    robot = _get_robot_or_404(request, robot_id)
    if robot is None:
        return Response({'detail': 'Not found'}, status=404)
    days = int(request.query_params.get('days', 30))
    return Response(stats.get_info_stats(robot, days))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def last_known_track(request, robot_id):
    robot = _get_robot_or_404(request, robot_id)
    if robot is None:
        return Response({'detail': 'Not found'}, status=404)
    return Response(stats.get_last_known_track(robot))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def statistics(request, robot_id):
    robot = _get_robot_or_404(request, robot_id)
    if robot is None:
        return Response({'detail': 'Not found'}, status=404)
    days = int(request.query_params.get('days', 30))
    gran = request.query_params.get('granularity', 'daily')
    return Response(stats.get_statistics(robot, days, gran))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patrol_tracks(request):
    robot_id = request.query_params.get('robotId')
    # Non-superadmin users can only query tracks for a robot they can see.
    if robot_id and _visible_robots(request.user).filter(id=robot_id).first() is None:
        return Response({'detail': 'Not found'}, status=404)
    return Response(stats.get_patrol_tracks(
        robot_id,
        request.query_params.get('deployment'),
        request.query_params.get('fromDate'),
        request.query_params.get('toDate'),
    ))


def _alert_payload(a):
    return {
        'id': a.id,
        'robotId': a.robot_id,
        'type': a.type,
        'severity': a.severity,
        'occurredAt': a.occurred_at.isoformat().replace('+00:00', 'Z'),
        'missionId': a.mission_id,
        'description': a.description,
        'descKey': a.desc_key,
        'mediaUrl': a.media_url,
        'acknowledged': a.acknowledged,
    }


def _resolution_payload(r):
    return {
        'status': r.status,
        'note': r.note,
        'resolvedBy': r.resolved_by,
        'resolvedAt': r.resolved_at.isoformat().replace('+00:00', 'Z'),
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def robot_alerts(request, robot_id):
    robot = _get_robot_or_404(request, robot_id)
    if robot is None:
        return Response({'detail': 'Not found'}, status=404)
    qs = robot.alerts.all()
    limit = request.query_params.get('limit')
    if limit is not None:
        qs = qs[:int(limit)]
    return Response([_alert_payload(a) for a in qs])


def _resolutions_for(user):
    alerts = Alert.objects.filter(robot__in=_visible_robots(user))
    return {r.alert_id: _resolution_payload(r) for r in AlertResolution.objects.filter(alert__in=alerts)}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def alert_resolutions(request):
    return Response(_resolutions_for(request.user))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resolve_alert(request, alert_id):
    alert = Alert.objects.filter(id=alert_id, robot__in=_visible_robots(request.user)).first()
    if alert is None:
        return Response({'detail': 'Not found'}, status=404)
    status_ = request.data.get('status')
    if status_ not in ('resolved', 'unresolved'):
        return Response({'detail': 'Invalid status'}, status=400)
    AlertResolution.objects.update_or_create(
        alert=alert,
        defaults={
            'status': status_,
            'note': request.data.get('note', ''),
            'resolved_by': request.data.get('resolvedBy', ''),
        },
    )
    return Response(_resolutions_for(request.user))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reopen_alert(request, alert_id):
    alert = Alert.objects.filter(id=alert_id, robot__in=_visible_robots(request.user)).first()
    if alert is None:
        return Response({'detail': 'Not found'}, status=404)
    AlertResolution.objects.filter(alert=alert).delete()
    return Response(_resolutions_for(request.user))


def _report_payload(r):
    return {
        'id': r.id,
        'robotId': r.robot_id,
        'period': r.period,
        'format': r.format,
        'generatedAt': r.generated_at.isoformat().replace('+00:00', 'Z'),
        'sizeKb': r.size_kb,
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_history(request, robot_id):
    robot = _get_robot_or_404(request, robot_id)
    if robot is None:
        return Response({'detail': 'Not found'}, status=404)
    return Response([_report_payload(r) for r in robot.reports.all()])
