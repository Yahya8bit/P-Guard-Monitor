from rest_framework import serializers

from .models import Robot


class RobotSerializer(serializers.ModelSerializer):
    commissionedAt = serializers.DateField(source='commissioned_at')
    currentMission = serializers.CharField(source='current_mission')

    class Meta:
        model = Robot
        fields = ['id', 'name', 'site', 'region', 'state', 'currentMission', 'battery', 'commissionedAt']


class UserSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    email = serializers.EmailField()
    role = serializers.CharField()
    assignedRobotIds = serializers.ListField(child=serializers.CharField())
