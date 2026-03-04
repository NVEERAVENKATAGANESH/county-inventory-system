"""
inventory/permissions.py

Single source of truth for role-based write permission.
The duplicate class that was also defined in views.py has been removed.
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS


class ActingRoleWritePermission(BasePermission):
    """
    Header-based write guard.
      X-Acting-Role: admin   → full CRUD
      X-Acting-Role: employee (or missing) → read-only (GET, HEAD, OPTIONS)
    """
    message = "Write access requires X-Acting-Role: admin header."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        role = (request.headers.get("X-Acting-Role") or "").strip().lower()
        return role == "admin"