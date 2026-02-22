from rest_framework.permissions import BasePermission

class IsDeveloperCode(BasePermission):
    def has_permission(self, request, view):
        return getattr(request, "auth", None) == "DEV_OK"
