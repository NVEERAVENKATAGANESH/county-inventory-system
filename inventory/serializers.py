"""
inventory/serializers.py — Fixed

Fix applied:
  - AuditLogSerializer had `changed_by` listed in BOTH `fields` (writable) AND
    `read_only_fields`. DRF resolves this ambiguously — the field appeared writable
    in some serializer introspection tools and could be set on creation.
  - Fix: remove `changed_by` from `fields` list. It's exposed via the
    `changed_by_username` SerializerMethodField which is already in fields.
    The FK ID is not useful to API consumers and should not be writable.
"""
from rest_framework import serializers
from core.models import Department, Location
from accounts.models import User
from .models import Asset, Consumable, AuditLog, MaintenanceRecord, InventoryRequest


# ─── Shared field helpers ──────────────────────────────────────────────────────

class DepartmentField(serializers.SlugRelatedField):
    """Accept department_code string; serialize back as department code."""
    def __init__(self, **kwargs):
        super().__init__(slug_field="code", queryset=Department.objects.all(), **kwargs)


class LocationNameField(serializers.SlugRelatedField):
    """Accept location name string; serialize back as location name."""
    def __init__(self, **kwargs):
        super().__init__(slug_field="name", queryset=Location.objects.all(), **kwargs)


# ─── Asset ─────────────────────────────────────────────────────────────────────

class AssetSerializer(serializers.ModelSerializer):
    department_code          = serializers.SerializerMethodField()
    location_name            = serializers.SerializerMethodField()
    assigned_to              = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, allow_null=True
    )
    assigned_to_username     = serializers.SerializerMethodField()
    warranty_status          = serializers.SerializerMethodField()
    depreciation_estimate    = serializers.SerializerMethodField()

    class Meta:
        model  = Asset
        fields = [
            "id",
            "asset_tag",
            "name",
            "category",
            "condition",
            "serial_number",
            "purchase_date",
            "purchase_price",
            "warranty_expiry",
            "assigned_to",
            "assigned_to_username",
            "warranty_status",
            "depreciation_estimate",
            "notes",
            "department",
            "department_code",
            "location",
            "location_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id", "assigned_to_username", "warranty_status",
            "depreciation_estimate", "created_at", "updated_at",
        ]

    def get_department_code(self, obj):
        return obj.department.code if obj.department else None

    def get_location_name(self, obj):
        return obj.location.name if obj.location else None

    def get_assigned_to_username(self, obj):
        return obj.assigned_to.username if obj.assigned_to_id else None

    def validate(self, attrs):
        purchase_date   = attrs.get("purchase_date")   or getattr(self.instance, "purchase_date",   None)
        warranty_expiry = attrs.get("warranty_expiry") or getattr(self.instance, "warranty_expiry", None)
        purchase_price  = attrs.get("purchase_price")  or getattr(self.instance, "purchase_price",  None)
        if warranty_expiry and purchase_date and warranty_expiry < purchase_date:
            raise serializers.ValidationError(
                {"warranty_expiry": "Warranty expiry cannot be before the purchase date."}
            )
        if purchase_price is not None and purchase_price < 0:
            raise serializers.ValidationError(
                {"purchase_price": "Purchase price cannot be negative."}
            )
        return attrs

    def get_warranty_status(self, obj):
        from datetime import date
        if not obj.warranty_expiry:
            return "N/A"
        delta = (obj.warranty_expiry - date.today()).days
        if delta < 0:   return "EXPIRED"
        if delta <= 30: return "EXPIRING"
        return "ACTIVE"

    def get_depreciation_estimate(self, obj):
        """
        Straight-line depreciation at 20% per year.
        Returns estimated current value or None if purchase_price/date missing
        or if purchase_date is in the future (asset not yet in service).
        """
        from datetime import date
        from decimal import Decimal
        if not obj.purchase_price or not obj.purchase_date:
            return None
        if obj.purchase_date > date.today():
            return float(obj.purchase_price)  # asset not yet in service; full value
        years_old = (date.today() - obj.purchase_date).days / 365.25
        rate = Decimal("0.20")  # 20% per year straight-line
        depreciated = obj.purchase_price * (1 - rate * Decimal(str(round(years_old, 4))))
        return float(max(Decimal("0"), depreciated).quantize(Decimal("0.01")))


# ─── Consumable ────────────────────────────────────────────────────────────────

class ConsumableSerializer(serializers.ModelSerializer):
    department_code = serializers.SerializerMethodField()
    location_name   = serializers.SerializerMethodField()
    is_low_stock    = serializers.BooleanField(read_only=True)

    class Meta:
        model  = Consumable
        fields = [
            "id",
            "sku",
            "name",
            "category",
            "unit",
            "quantity_on_hand",
            "reorder_level",
            "supplier",
            "notes",
            "department",
            "department_code",
            "location",
            "location_name",
            "is_low_stock",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_low_stock", "created_at", "updated_at"]

    def get_department_code(self, obj):
        return obj.department.code if obj.department else None

    def get_location_name(self, obj):
        return obj.location.name if obj.location else None


# ─── AuditLog ──────────────────────────────────────────────────────────────────

class AuditLogSerializer(serializers.ModelSerializer):
    changed_by_username = serializers.SerializerMethodField()
    department_code     = serializers.SerializerMethodField()
    department_name     = serializers.SerializerMethodField()

    class Meta:
        model  = AuditLog
        fields = [
            "id",
            "timestamp",
            "entity_type",
            "entity_id",
            "action",
            "summary",
            # FIX: removed "changed_by" (FK integer) from fields.
            # It was also in read_only_fields — DRF handles this ambiguously.
            # Consumers get the username via changed_by_username instead.
            "changed_by_username",
            "department",
            "department_code",
            "department_name",
            "before",
            "after",
        ]
        # FIX: "changed_by" removed from fields above, so remove from read_only_fields too
        read_only_fields = ["id", "timestamp", "before", "after"]

    def get_changed_by_username(self, obj):
        return getattr(obj.changed_by, "username", None)

    def get_department_code(self, obj):
        return obj.department.code if obj.department else None

    def get_department_name(self, obj):
        return obj.department.name if obj.department else None


# ─── MaintenanceRecord ──────────────────────────────────────────────────────────

class MaintenanceRecordSerializer(serializers.ModelSerializer):
    asset_tag          = serializers.SerializerMethodField()
    asset_name         = serializers.SerializerMethodField()
    logged_by_username = serializers.SerializerMethodField()

    class Meta:
        model  = MaintenanceRecord
        fields = [
            "id",
            "asset",
            "asset_tag",
            "asset_name",
            "date",
            "maintenance_type",
            "description",
            "cost",
            "performed_by",
            "next_due_date",
            "notes",
            "logged_by",
            "logged_by_username",
            "created_at",
        ]
        read_only_fields = ["id", "asset_tag", "asset_name", "logged_by_username", "created_at"]

    def validate(self, attrs):
        from decimal import Decimal
        mdate    = attrs.get("date")          or getattr(self.instance, "date",          None)
        next_due = attrs.get("next_due_date") or getattr(self.instance, "next_due_date", None)
        cost     = attrs.get("cost")          if "cost" in attrs else getattr(self.instance, "cost", None)
        if next_due and mdate and next_due < mdate:
            raise serializers.ValidationError(
                {"next_due_date": "Next due date cannot be before the maintenance date."}
            )
        if cost is not None and cost < Decimal("0"):
            raise serializers.ValidationError(
                {"cost": "Cost cannot be negative."}
            )
        return attrs

    def get_asset_tag(self, obj):
        return obj.asset.asset_tag if obj.asset_id else None

    def get_asset_name(self, obj):
        return obj.asset.name if obj.asset_id else None

    def get_logged_by_username(self, obj):
        return obj.logged_by.username if obj.logged_by_id else None


# ─── InventoryRequest ───────────────────────────────────────────────────────────

class InventoryRequestSerializer(serializers.ModelSerializer):
    requested_by_username = serializers.SerializerMethodField()
    resolved_by_username  = serializers.SerializerMethodField()
    department_code       = serializers.SerializerMethodField()
    asset_tag             = serializers.SerializerMethodField()

    class Meta:
        model  = InventoryRequest
        fields = [
            "id",
            "request_type",
            "status",
            "requested_by",
            "requested_by_username",
            "department",
            "department_code",
            "asset",
            "asset_tag",
            "title",
            "description",
            "quantity",
            "resolved_by",
            "resolved_by_username",
            "admin_notes",
            "resolved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id", "requested_by_username", "resolved_by_username",
            "department_code", "asset_tag", "resolved_at", "created_at", "updated_at",
        ]

    def get_requested_by_username(self, obj):
        return obj.requested_by.username if obj.requested_by_id else None

    def get_resolved_by_username(self, obj):
        return obj.resolved_by.username if obj.resolved_by_id else None

    def get_department_code(self, obj):
        return obj.department.code if obj.department_id else None

    def get_asset_tag(self, obj):
        return obj.asset.asset_tag if obj.asset_id else None