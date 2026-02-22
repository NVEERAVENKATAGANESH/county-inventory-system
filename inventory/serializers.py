from rest_framework import serializers
from .models import Asset, Consumable, AuditLog


class AssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = "__all__"


class ConsumableSerializer(serializers.ModelSerializer):
    class Meta:
        model = Consumable
        fields = "__all__"


class AuditLogSerializer(serializers.ModelSerializer):
    changed_by_username = serializers.SerializerMethodField()
    department_code = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "timestamp",
            "entity_type",
            "entity_id",
            "action",
            "summary",
            "changed_by",
            "changed_by_username",
            "department",
            "department_code",
            "department_name",
            "before",
            "after",
        ]
        read_only_fields = [
            "id",
            "timestamp",
            "before",
            "after",
            "changed_by",
        ]

    def get_changed_by_username(self, obj):
        return getattr(obj.changed_by, "username", None)

    def get_department_code(self, obj):
        return getattr(obj.department, "code", None)

    def get_department_name(self, obj):
        return getattr(obj.department, "name", None)
