"""
common/authentication.py

DevCodeAuthentication validates X-Dev-Key against the database.
The key must be the username of an active DEVELOPER-role user.
No env var required — fully DB-backed.
"""
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


class DevCodeAuthentication(BaseAuthentication):
    """
    Authenticates developer panel requests via X-Dev-Key header.

    Frontend sends: X-Dev-Key: <username>
    Backend looks up a User with that username and role=DEVELOPER.

    Returns (None, "DEV_OK") so IsDeveloperCode permission can check auth token.
    """

    def authenticate(self, request):
        provided = (request.headers.get("X-Dev-Key") or "").strip()
        if not provided:
            return None  # Not a dev request — let other authenticators handle it

        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            User.objects.get(username=provided, role="DEVELOPER", is_active=True)
        except User.DoesNotExist:
            raise AuthenticationFailed("Invalid developer key.")

        return (None, "DEV_OK")

    def authenticate_header(self, request):
        return "X-Dev-Key"


# IsDeveloperCode is defined in common/permissions.py (canonical location).
# Re-exported here for backwards compatibility — dev_views.py and any other
# existing code that does `from common.authentication import IsDeveloperCode`
# will continue to work without any changes.
from common.permissions import IsDeveloperCode  # noqa: F401  re-export