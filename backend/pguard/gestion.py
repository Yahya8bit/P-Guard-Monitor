"""Gestion (fleet/user assignment) endpoints — superadmin manages admins +
robot->admin assignment; admin manages clients + robot->client assignment for
their own robots. Mirrors the validation rules from the old frontend mock
(mock.ts createClient/addAdmin/removeAdmin/etc.)."""
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import EmailValidator
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Profile, Robot
from .serializers import RobotSerializer
from .views import _user_payload

_validate_email = EmailValidator(message='Email invalide')


def _all_users_payload():
    # Excludes accounts with no Profile (e.g. the Django-admin-only superuser) —
    # those aren't app users and have no role/assignedRobotIds to show.
    return [_user_payload(u) for u in User.objects.filter(profile__isnull=False).select_related('profile').order_by('id')]


def _require_role(request, roles):
    return request.user.profile.role in roles


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users(request):
    if not _require_role(request, ('superadmin', 'admin')):
        return Response({'detail': 'Forbidden'}, status=403)
    return Response(_all_users_payload())


def _create_user(name, email, password, role, enforce_password_rules=True):
    name, email = name.strip(), email.strip()
    if not name or not email or not password.strip():
        return None, 'Champs requis manquants'
    try:
        _validate_email(email)
    except ValidationError:
        return None, 'Email invalide'
    if User.objects.filter(username=email).exists():
        return None, 'Email déjà utilisé'
    if enforce_password_rules:
        try:
            validate_password(password)  # AUTH_PASSWORD_VALIDATORS in settings.py
        except ValidationError as e:
            return None, ' '.join(e.messages)
    user = User.objects.create_user(username=email, email=email, first_name=name, password=password)
    Profile.objects.create(user=user, role=role)
    return user, None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_admin(request):
    if not _require_role(request, ('superadmin',)):
        return Response({'detail': 'Forbidden'}, status=403)
    _, err = _create_user(
        request.data.get('name', ''), request.data.get('email', ''), request.data.get('password', ''), 'admin',
    )
    if err:
        return Response({'detail': err}, status=400)
    return Response(_all_users_payload())


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_client(request):
    if not _require_role(request, ('superadmin', 'admin')):
        return Response({'detail': 'Forbidden'}, status=403)
    # Quick-assign flow (Gestion "new client" inline form) omits a password —
    # same fallback the frontend mock used: login accepts "demo" for any user.
    # Password rules only apply when the caller actually supplied one.
    raw_password = request.data.get('password')
    _, err = _create_user(
        request.data.get('name', ''), request.data.get('email', ''), raw_password or 'demo', 'client',
        enforce_password_rules=bool(raw_password),
    )
    if err:
        return Response({'detail': err}, status=400)
    return Response(_all_users_payload())


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_admin(request, user_id):
    if not _require_role(request, ('superadmin',)):
        return Response({'detail': 'Forbidden'}, status=403)
    target = User.objects.filter(id=user_id, profile__role='admin').first()
    if target is None:
        return Response({'detail': 'Admin introuvable'}, status=404)
    if target.email.lower() == 'ops@enova.local':
        return Response({'detail': 'Impossible de supprimer le superadmin'}, status=400)
    if User.objects.filter(profile__role='admin').count() <= 1:
        return Response({'detail': 'Impossible de supprimer le dernier admin'}, status=400)
    target.delete()  # cascades: Profile deleted, M2M assignments cleared
    return Response(_all_users_payload())


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_client(request, user_id):
    if not _require_role(request, ('superadmin', 'admin')):
        return Response({'detail': 'Forbidden'}, status=403)
    target = User.objects.filter(id=user_id, profile__role='client').first()
    if target is None:
        return Response({'detail': 'Client introuvable'}, status=404)
    target.delete()
    return Response(_all_users_payload())


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_robot_admin(request, robot_id):
    if not _require_role(request, ('superadmin',)):
        return Response({'detail': 'Forbidden'}, status=403)
    robot = Robot.objects.filter(id=robot_id).first()
    if robot is None:
        return Response({'detail': 'Not found'}, status=404)
    admin_id = request.data.get('adminId')
    with transaction.atomic():
        for p in Profile.objects.filter(role='admin', assigned_robots=robot):
            p.assigned_robots.remove(robot)
        if admin_id:
            admin = Profile.objects.filter(user_id=admin_id, role='admin').first()
            if admin is None:
                return Response({'detail': 'Admin introuvable'}, status=404)
            admin.assigned_robots.add(robot)
    return Response(_all_users_payload())


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_robot_client(request, robot_id):
    if not _require_role(request, ('superadmin', 'admin')):
        return Response({'detail': 'Forbidden'}, status=403)
    robot = Robot.objects.filter(id=robot_id).first()
    if robot is None:
        return Response({'detail': 'Not found'}, status=404)
    # An admin may only assign clients to robots they themselves manage.
    if request.user.profile.role == 'admin' and not request.user.profile.assigned_robots.filter(id=robot_id).exists():
        return Response({'detail': 'Forbidden'}, status=403)
    client_id = request.data.get('clientId')
    client = Profile.objects.filter(user_id=client_id, role='client').first()
    if client is None:
        return Response({'detail': 'Client introuvable'}, status=404)
    with transaction.atomic():
        for p in Profile.objects.filter(role='client', assigned_robots=robot):
            p.assigned_robots.remove(robot)
        client.assigned_robots.set([robot])  # exactly one robot per client
    return Response(_all_users_payload())


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_robot(request):
    if not _require_role(request, ('superadmin',)):
        return Response({'detail': 'Forbidden'}, status=403)
    name = request.data.get('name', '').strip()
    site = request.data.get('site', '').strip()
    state = request.data.get('state', '')
    commissioned_at = request.data.get('commissionedAt', '')
    if not name or not site or not commissioned_at:
        return Response({'detail': 'Champs requis manquants'}, status=400)
    if Robot.objects.filter(name__iexact=name).exists():
        return Response({'detail': 'Nom de robot déjà utilisé'}, status=400)

    existing_nums = [int(r.id.split('-')[1]) for r in Robot.objects.all() if r.id.startswith('PG-')]
    next_id = f'PG-{(max(existing_nums, default=0) + 1):03d}'
    Robot.objects.create(
        id=next_id, name=name, site=site, region='germany', state=state,
        current_mission=None, battery=100, commissioned_at=commissioned_at,
    )
    return Response(RobotSerializer(Robot.objects.all().order_by('id'), many=True).data)
