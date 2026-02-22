from rest_framework.permissions import BasePermission, SAFE_METHODS

class ActingRoleWritePermission(BasePermission):
    """
    No authentication.
    We authorize writes using request header: X-Acting-Role = admin|employee
    - admin: can write
    - employee: read-only
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True

        role = (request.headers.get("X-Acting-Role") or "").strip().lower()
        return role == "admin"
