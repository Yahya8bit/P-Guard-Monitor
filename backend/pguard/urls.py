from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import gestion, views

urlpatterns = [
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', views.me, name='me'),
    path('auth/change-password/', views.change_password, name='change_password'),
    path('auth/notifications/', views.notification_prefs, name='notification_prefs'),
    path('robots/', views.list_robots, name='list_robots'),
    path('robots/create/', gestion.create_robot, name='create_robot'),
    path('robots/<str:robot_id>/', views.get_robot, name='get_robot'),
    path('robots/<str:robot_id>/dashboard/', views.dashboard, name='dashboard'),
    path('robots/<str:robot_id>/trend/', views.trend, name='trend'),
    path('robots/<str:robot_id>/battery/', views.battery, name='battery'),
    path('robots/<str:robot_id>/incidents-breakdown/', views.incident_breakdown, name='incident_breakdown'),
    path('robots/<str:robot_id>/info-stats/', views.info_stats, name='info_stats'),
    path('robots/<str:robot_id>/last-known-track/', views.last_known_track, name='last_known_track'),
    path('robots/<str:robot_id>/statistics/', views.statistics, name='statistics'),
    path('patrol-tracks/', views.patrol_tracks, name='patrol_tracks'),
    path('robots/<str:robot_id>/alerts/', views.robot_alerts, name='robot_alerts'),
    path('alerts/resolutions/', views.alert_resolutions, name='alert_resolutions'),
    path('alerts/<str:alert_id>/resolve/', views.resolve_alert, name='resolve_alert'),
    path('alerts/<str:alert_id>/reopen/', views.reopen_alert, name='reopen_alert'),
    path('users/', gestion.list_users, name='list_users'),
    path('admins/', gestion.create_admin, name='create_admin'),
    path('admins/<int:user_id>/', gestion.delete_admin, name='delete_admin'),
    path('clients/', gestion.create_client, name='create_client'),
    path('clients/<int:user_id>/', gestion.delete_client, name='delete_client'),
    path('robots/<str:robot_id>/assign-admin/', gestion.assign_robot_admin, name='assign_robot_admin'),
    path('robots/<str:robot_id>/assign-client/', gestion.assign_robot_client, name='assign_robot_client'),
    path('robots/<str:robot_id>/reports/', views.report_history, name='report_history'),
]
