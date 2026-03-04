"""
accounts/views.py

POST /api/auth/login/ — validates username + password, returns user info
GET/PATCH /api/me/    — current session user info + profile update
CRUD /api/users/      — user management (admin only for writes)
POST /api/auth/change-password/ — change password
"""

from django.contrib.auth import authenticate as django_authenticate
from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from inventory.permissions import ActingRoleWritePermission

from .models import User
from .serializers import (
    MeSerializer,
    MeUpdateSerializer,
    UserCreateSerializer,
    UserListSerializer,
)


# ─────────────────────────────────────────────
# /api/auth/login/
# ─────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
def auth_login(request):
    """
    POST /api/auth/login/
    Body: {"username": "...", "password": "..."}
    Stateless auth: returns user info; frontend stores in localStorage and uses headers.
    """
    username = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""

    if not username or not password:
        return Response({"detail": "Username and password are required."}, status=400)

    user = django_authenticate(request, username=username, password=password)
    if user is None:
        return Response({"detail": "Invalid username or password."}, status=401)
    if not user.is_active:
        return Response({"detail": "This account has been deactivated."}, status=401)

    role_map = {
        "COUNTY_ADMIN": "admin",
        "DEPT_MANAGER": "admin",
        "EMPLOYEE": "employee",
        "DEVELOPER": "admin",
    }
    portal_role = role_map.get(user.role, "employee")

    return Response({
        "username": user.username,
        "role": portal_role,
        "django_role": user.role,
        "department_code": user.department.code if user.department else "",
        "department_name": user.department.name if user.department else "",
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_active": user.is_active,
    })


# ─────────────────────────────────────────────
# /api/me/
# ─────────────────────────────────────────────

@api_view(["GET", "PATCH"])
@permission_classes([AllowAny])
def me(request):
    """
    Identify via X-Username header (stateless / header-based auth).
    Falls back to request.user for session-auth requests.

    PATCH allows user to update:
      - first_name, last_name
      - username, email (requires current_password)
    """
    username = (request.headers.get("X-Username") or "").strip()
    if username:
        try:
            user = User.objects.select_related("department").get(username=username, is_active=True)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=404)
    else:
        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return Response({"detail": "Not authenticated."}, status=401)

    if request.method == "PATCH":
        incoming = request.data or {}

        new_username = (incoming.get("username") or "").strip() if "username" in incoming else user.username
        new_email = (incoming.get("email") or "").strip() if "email" in incoming else (user.email or "")

        wants_username_change = "username" in incoming and new_username != user.username
        wants_email_change = "email" in incoming and new_email != (user.email or "")

        if wants_username_change or wants_email_change:
            current_password = incoming.get("current_password") or ""
            if not current_password:
                return Response(
                    {"detail": "Current password is required to change username or email."},
                    status=400
                )
            authed = django_authenticate(request, username=user.username, password=current_password)
            if authed is None:
                return Response({"detail": "Current password is incorrect."}, status=401)

        ser = MeUpdateSerializer(user, data=incoming, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=400)

        ser.save()
        return Response(MeSerializer(user).data)

    return Response(MeSerializer(user).data)


# ─────────────────────────────────────────────
# /api/users/
# ─────────────────────────────────────────────

def _is_admin(request):
    return (request.headers.get("X-Acting-Role") or "").strip().lower() == "admin"


class UserViewSet(viewsets.ModelViewSet):
    """
    CRUD for User accounts.
    - GET (list/retrieve): any authenticated portal user
    - POST/PATCH/DELETE: admin role only
    - DEVELOPER excluded (DevPanel uses separate endpoints)
    """
    permission_classes = [ActingRoleWritePermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["role", "is_active", "department"]
    search_fields = ["username", "email", "first_name", "last_name"]
    ordering_fields = ["username", "date_joined", "role"]

    def get_queryset(self):
        from common.demo import is_demo_unlocked
        qs = User.objects.select_related("department").exclude(role="DEVELOPER").order_by("username")
        if not is_demo_unlocked(self.request):
            return qs.none()
        return qs

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return UserCreateSerializer
        return UserListSerializer

    @action(detail=True, methods=["post"], url_path="set-password")
    def set_password(self, request, pk=None):
        if not _is_admin(request):
            return Response({"detail": "Admin only."}, status=403)

        user = self.get_object()
        password = (request.data.get("password") or "").strip()
        if not password:
            return Response({"detail": "Password is required."}, status=400)

        try:
            password_validation.validate_password(password, user=user)
        except ValidationError as e:
            return Response({"detail": list(e.messages)}, status=400)

        user.set_password(password)
        user.save()
        return Response({"detail": "Password updated."})


# ─────────────────────────────────────────────
# /api/auth/change-password/
# ─────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
def change_password(request):
    """
    POST /api/auth/change-password/
    Body: {"current_password": "...", "new_password": "...", "confirm_password": "..."}
    """
    username = (request.headers.get("X-Username") or "").strip()
    current_password = request.data.get("current_password", "")
    new_password = (request.data.get("new_password", "") or "").strip()
    confirm_password = (request.data.get("confirm_password", "") or "").strip()

    if not username:
        return Response({"detail": "Not authenticated."}, status=401)
    if not current_password or not new_password or not confirm_password:
        return Response({"detail": "All fields are required."}, status=400)
    if new_password != confirm_password:
        return Response({"detail": "New passwords do not match."}, status=400)
    if new_password == current_password:
        return Response({"detail": "New password must differ from current password."}, status=400)

    user = django_authenticate(request, username=username, password=current_password)
    if user is None:
        return Response({"detail": "Current password is incorrect."}, status=401)
    if not user.is_active:
        return Response({"detail": "Account deactivated."}, status=401)

    try:
        password_validation.validate_password(new_password, user=user)
    except ValidationError as e:
        return Response({"detail": list(e.messages)}, status=400)

    user.set_password(new_password)
    user.save()
    return Response({"detail": "Password updated successfully."})