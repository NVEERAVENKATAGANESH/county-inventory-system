"""
common/admin_mixins.py — Fixed

Fix applied:
  - save_model raised `PermissionError` (Python built-in OSError subclass)
    which Django does NOT catch and convert to a 403 response.
    Instead it propagates as a 500 Internal Server Error.
  - Changed to `PermissionDenied` from django.core.exceptions, which Django
    admin DOES catch and renders as a proper 403 Forbidden page.
"""
from django.core.exceptions import PermissionDenied  # FIX: was Python's PermissionError
from accounts.models import User


class DeptScopedAdminMixin:
    """
    Admin restriction:
    - County Admin: can see all objects
    - Dept Manager/Staff: only see objects in their department
    Assumes model has a `department` FK.
    """

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        u = request.user
        if not u.is_authenticated:
            return qs.none()
        if getattr(u, "role", None) == User.Role.COUNTY_ADMIN:
            return qs
        if getattr(u, "department_id", None) is None:
            return qs.none()
        return qs.filter(department_id=u.department_id)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """
        Restrict FK dropdown choices (e.g., location, department) for non-admin users.
        """
        u = request.user
        if u.is_authenticated and getattr(u, "role", None) != User.Role.COUNTY_ADMIN:
            if db_field.name == "department" and getattr(u, "department_id", None):
                kwargs["queryset"] = db_field.remote_field.model.objects.filter(
                    id=u.department_id
                )
            if db_field.name == "location" and getattr(u, "department_id", None):
                kwargs["queryset"] = db_field.remote_field.model.objects.filter(
                    department_id=u.department_id
                )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def save_model(self, request, obj, form, change):
        """
        Non-admin: force department to user's department on save.
        """
        u = request.user
        if u.is_authenticated and getattr(u, "role", None) != User.Role.COUNTY_ADMIN:
            if getattr(u, "department_id", None) is None:
                # FIX: was `raise PermissionError(...)` → Django does NOT catch this → 500
                # PermissionDenied is caught by Django admin → renders 403 Forbidden
                raise PermissionDenied("User has no department assigned.")
            obj.department_id = u.department_id
        super().save_model(request, obj, form, change)