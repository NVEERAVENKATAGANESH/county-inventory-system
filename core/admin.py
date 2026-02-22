from django.contrib import admin
from accounts.models import User
from .models import Department, Location

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "code")
    search_fields = ("name", "code")

    def has_view_permission(self, request, obj=None):
        return request.user.is_authenticated and request.user.role == User.Role.COUNTY_ADMIN

    def has_module_permission(self, request):
        return request.user.is_authenticated and request.user.role == User.Role.COUNTY_ADMIN

@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ("name", "department", "address")
    list_filter = ("department",)
    search_fields = ("name", "address")

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        u = request.user
        if not u.is_authenticated:
            return qs.none()
        if u.role == User.Role.COUNTY_ADMIN:
            return qs
        if u.department_id is None:
            return qs.none()
        return qs.filter(department_id=u.department_id)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        u = request.user
        if u.is_authenticated and u.role != User.Role.COUNTY_ADMIN:
            if db_field.name == "department" and u.department_id:
                kwargs["queryset"] = Department.objects.filter(id=u.department_id)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def save_model(self, request, obj, form, change):
        u = request.user
        if u.is_authenticated and u.role != User.Role.COUNTY_ADMIN:
            if u.department_id is None:
                raise PermissionError("User has no department assigned.")
            obj.department_id = u.department_id
        super().save_model(request, obj, form, change)
