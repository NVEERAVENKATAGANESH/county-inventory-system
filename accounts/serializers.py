from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class MeSerializer(serializers.ModelSerializer):
    department_code = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "role", "department", "department_code", "department_name", "is_staff", "is_superuser"]

    def get_department_code(self, obj):
        return obj.department.code if obj.department else None

    def get_department_name(self, obj):
        return obj.department.name if obj.department else None
