"""
core/serializers.py

Serializers for Department and Location models.
"""
from django.db.models import Count
from rest_framework import serializers

from .models import Department, Location


class LocationSerializer(serializers.ModelSerializer):
    department_name = serializers.SerializerMethodField()

    class Meta:
        model  = Location
        fields = ["id", "name", "address", "department", "department_name"]
        read_only_fields = ["id", "department_name"]

    def get_department_name(self, obj):
        return obj.department.name if obj.department_id else None


class DepartmentSerializer(serializers.ModelSerializer):
    locations        = LocationSerializer(many=True, read_only=True)
    asset_count      = serializers.IntegerField(read_only=True, default=0)
    consumable_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model  = Department
        fields = ["id", "name", "code", "asset_count", "consumable_count", "locations"]
        read_only_fields = ["id", "asset_count", "consumable_count", "locations"]

    def validate_code(self, value):
        """Force department codes to uppercase so lookups are always consistent."""
        return value.strip().upper()

    def validate_name(self, value):
        return value.strip()
