from django.contrib import admin
from common.admin_mixins import DeptScopedAdminMixin
from .models import Asset, Consumable, AuditLog
from accounts.models import User

@admin.register(Asset)
class AssetAdmin(DeptScopedAdminMixin, admin.ModelAdmin):
    list_display = ("asset_tag", "name", "department", "location", "condition", "updated_at")
    list_filter = ("department", "condition", "category")
    search_fields = ("asset_tag", "name", "serial_number")

@admin.register(Consumable)
class ConsumableAdmin(DeptScopedAdminMixin, admin.ModelAdmin):
    list_display = ("sku", "name", "department", "location", "quantity_on_hand", "reorder_level", "updated_at")
    list_filter = ("department", "category")
    search_fields = ("sku", "name", "supplier")

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "entity_type", "entity_id", "action", "changed_by", "summary")
    list_filter = ("entity_type", "action")
    search_fields = ("entity_id", "summary")

    def has_view_permission(self, request, obj=None):
        return request.user.is_authenticated and request.user.role == User.Role.COUNTY_ADMIN

    def has_module_permission(self, request):
        return request.user.is_authenticated and request.user.role == User.Role.COUNTY_ADMIN
