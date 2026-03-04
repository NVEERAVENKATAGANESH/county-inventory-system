"""
accounts/serializers.py

MeSerializer: exposes safe user fields + role + department for /api/me/
MeUpdateSerializer: allows logged-in user to update own profile safely
UserListSerializer: full user list for /api/users/
UserCreateSerializer: create/update users with password hashing
"""

from rest_framework import serializers
from django.contrib.auth import password_validation
from .models import User


# -------------------------------------------------------
# ME (GET)
# -------------------------------------------------------

class MeSerializer(serializers.ModelSerializer):
    department_code = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "department_code",
            "department_name",
            "is_active",
            "is_staff",
            "date_joined",
            "last_login",
        ]
        read_only_fields = fields

    def get_department_code(self, obj):
        return obj.department.code if obj.department else None

    def get_department_name(self, obj):
        return obj.department.name if obj.department else None


# -------------------------------------------------------
# ME (PATCH) — Used by Settings page
# -------------------------------------------------------

class MeUpdateSerializer(serializers.ModelSerializer):
    """
    Allows user to update:
      - username
      - email
      - first_name
      - last_name

    Sensitive changes (username/email) should be validated
    in the view by checking current_password.
    """

    class Meta:
        model = User
        fields = ["username", "email", "first_name", "last_name"]

    def validate_username(self, value):
        value = (value or "").strip()

        if not value:
            raise serializers.ValidationError("Username is required.")

        if len(value) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters.")

        qs = User.objects.filter(username__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError("This username is already taken.")

        return value

    def validate_email(self, value):
        value = (value or "").strip()

        if not value:
            return value  # allow blank if your model allows it

        qs = User.objects.filter(email__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError("This email is already in use.")

        return value


# -------------------------------------------------------
# USER LIST (ADMIN)
# -------------------------------------------------------

class UserListSerializer(serializers.ModelSerializer):
    department_code = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    assigned_assets_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "department",
            "department_code",
            "department_name",
            "is_active",
            "date_joined",
            "last_login",
            "assigned_assets_count",
        ]
        read_only_fields = [
            "id",
            "date_joined",
            "last_login",
            "department_code",
            "department_name",
            "assigned_assets_count",
        ]

    def get_department_code(self, obj):
        return obj.department.code if obj.department else None

    def get_department_name(self, obj):
        return obj.department.name if obj.department else None

    def get_assigned_assets_count(self, obj):
        return obj.assigned_assets.count()


# -------------------------------------------------------
# USER CREATE / UPDATE (ADMIN)
# -------------------------------------------------------

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=False,
        min_length=8,
        style={"input_type": "password"}
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "department",
            "is_active",
            "password",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        password = validated_data.pop("password", None)

        user = User(**validated_data)

        if password:
            password_validation.validate_password(password, user)
            user.set_password(password)
        else:
            user.set_unusable_password()

        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            password_validation.validate_password(password, instance)
            instance.set_password(password)

        instance.save()
        return instance