"""
core/dev_views.py

Developer endpoints:
  POST /api/dev/login/           — validates credentials, checks DEVELOPER role
  GET  /api/dev/status/          — verifies active dev session (X-Dev-Key header)
  GET  /api/dev/profile/         — dev user profile info (name, email, dates)
  POST /api/dev/change-password/ — change dev password (requires current password)
"""
from django.conf import settings
from django.contrib.auth import authenticate as django_authenticate

from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from common.authentication import DevCodeAuthentication, IsDeveloperCode


@api_view(["POST"])
@permission_classes([AllowAny])
def dev_login(request):
    """
    POST /api/dev/login/
    Body: {"username": "...", "password": "..."}

    Validates credentials via Django auth and checks for DEVELOPER role.
    Returns {username, message} on success; 401/403 on failure.
    """
    username = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""

    if not username or not password:
        return Response({"detail": "Username and password are required."}, status=400)

    user = django_authenticate(request, username=username, password=password)
    if user is None:
        return Response({"detail": "Invalid credentials."}, status=401)
    if not user.is_active:
        return Response({"detail": "Account deactivated."}, status=401)
    if getattr(user, "role", None) != "DEVELOPER":
        return Response({"detail": "Developer access required. Contact ISSI admin."}, status=403)

    return Response({
        "username": user.username,
        "message": "Dev access granted ✅",
    })


@api_view(["GET"])
@authentication_classes([DevCodeAuthentication])
@permission_classes([IsDeveloperCode])
def dev_status(request):
    """
    GET /api/dev/status/
    Returns basic server info for the DevPanel diagnostics tab.
    """
    return Response({
        "dev": True,
        "message": "Dev access verified ✅",
        "user": request.headers.get("X-Dev-Key", ""),
        "debug": settings.DEBUG,
    })


@api_view(["GET"])
@authentication_classes([DevCodeAuthentication])
@permission_classes([IsDeveloperCode])
def dev_profile(request):
    """
    GET /api/dev/profile/
    Returns profile info for the authenticated developer user.
    """
    dev_username = (request.headers.get("X-Dev-Key") or "").strip()

    from django.contrib.auth import get_user_model
    User = get_user_model()

    try:
        user = User.objects.get(username=dev_username, role="DEVELOPER", is_active=True)
        full_name = f"{user.first_name} {user.last_name}".strip() or user.username
        return Response({
            "username":    user.username,
            "email":       user.email or "",
            "first_name":  user.first_name,
            "last_name":   user.last_name,
            "full_name":   full_name,
            "role":        user.role,
            "is_staff":    user.is_staff,
            "date_joined": user.date_joined.strftime("%Y-%m-%d") if user.date_joined else None,
            "last_login":  user.last_login.strftime("%Y-%m-%d %H:%M UTC") if user.last_login else "Never",
        })
    except User.DoesNotExist:
        return Response({"detail": "Developer user not found."}, status=404)


@api_view(["GET"])
@authentication_classes([DevCodeAuthentication])
@permission_classes([IsDeveloperCode])
def dev_users(request):
    """
    GET /api/dev/users/
    Returns ALL system users including DEVELOPER accounts.
    Only accessible with a valid X-Dev-Key header — never exposed in the portal.
    """
    from accounts.models import User
    from accounts.serializers import UserListSerializer

    search = (request.query_params.get("search") or "").strip()
    qs = User.objects.select_related("department").order_by("username")
    if search:
        qs = qs.filter(username__icontains=search) | qs.filter(email__icontains=search)

    serializer = UserListSerializer(qs, many=True)
    return Response({"count": qs.count(), "results": serializer.data})


@api_view(["POST"])
@authentication_classes([DevCodeAuthentication])
@permission_classes([IsDeveloperCode])
def dev_change_password(request):
    """
    POST /api/dev/change-password/
    Body: {"current_password": "...", "new_password": "...", "confirm_password": "..."}

    Validates current_password via Django auth, then updates to new_password.
    Requires X-Dev-Key header (DEVELOPER role).
    """
    dev_username     = (request.headers.get("X-Dev-Key") or "").strip()
    current_password = request.data.get("current_password", "")
    new_password     = (request.data.get("new_password", "") or "").strip()
    confirm_password = (request.data.get("confirm_password", "") or "").strip()

    if not current_password or not new_password or not confirm_password:
        return Response({"detail": "All fields are required."}, status=400)
    if new_password != confirm_password:
        return Response({"detail": "New passwords do not match."}, status=400)
    if len(new_password) < 8:
        return Response({"detail": "New password must be at least 8 characters."}, status=400)
    if new_password == current_password:
        return Response({"detail": "New password must differ from current password."}, status=400)

    user = django_authenticate(request, username=dev_username, password=current_password)
    if user is None:
        return Response({"detail": "Current password is incorrect."}, status=401)

    user.set_password(new_password)
    user.save()
    return Response({"detail": "Password updated successfully."})

@api_view(["POST"])
@authentication_classes([DevCodeAuthentication])
@permission_classes([IsDeveloperCode])
def dev_seed(request):
    """
    POST /api/dev/seed/
    Runs the management command seed_county to create demo DB data.

    Requires a valid developer session (X-Dev-Key header).
    """
    from django.core.management import call_command

    try:
        call_command("seed_county")
        return Response({"ok": True, "detail": "Seed applied (seed_county) ✅"})
    except Exception as e:
        return Response({"ok": False, "detail": f"Seed failed: {e}"}, status=500)