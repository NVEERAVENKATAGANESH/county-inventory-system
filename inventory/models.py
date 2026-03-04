from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from core.models import Department, Location


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class Asset(TimestampedModel):
    class Condition(models.TextChoices):
        GOOD = "GOOD", "Good"
        NEEDS_REPAIR = "NEEDS_REPAIR", "Needs Repair"
        RETIRED = "RETIRED", "Retired"

    asset_tag = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=180)
    category = models.CharField(max_length=120, blank=True, default="")

    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="assets")
    location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True, related_name="assets")

    condition = models.CharField(max_length=32, choices=Condition.choices, default=Condition.GOOD)
    serial_number = models.CharField(max_length=120, blank=True, default="")
    purchase_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    # Professional lifecycle fields
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    warranty_expiry = models.DateField(null=True, blank=True)
    assigned_to = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="assigned_assets"
    )

    def __str__(self):
        return f"{self.asset_tag} - {self.name}"

class Consumable(TimestampedModel):
    sku = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=180)
    category = models.CharField(max_length=120, blank=True, default="")

    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="consumables")
    location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True, related_name="consumables")

    quantity_on_hand = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    reorder_level = models.IntegerField(default=0, validators=[MinValueValidator(0)])

    unit = models.CharField(max_length=32, blank=True, default="each")
    supplier = models.CharField(max_length=120, blank=True, default="")
    notes = models.TextField(blank=True, default="")

    @property
    def is_low_stock(self) -> bool:
        # Only flag as low stock when a reorder threshold is actually set (> 0)
        return self.reorder_level > 0 and self.quantity_on_hand <= self.reorder_level

    def __str__(self):
        return f"{self.sku} - {self.name}"

class MaintenanceRecord(TimestampedModel):
    class MType(models.TextChoices):
        PREVENTIVE  = "PREVENTIVE",  "Preventive"
        CORRECTIVE  = "CORRECTIVE",  "Corrective"
        INSPECTION  = "INSPECTION",  "Inspection"
        CALIBRATION = "CALIBRATION", "Calibration"

    asset            = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name="maintenance_records")
    date             = models.DateField()
    maintenance_type = models.CharField(max_length=20, choices=MType.choices, default=MType.PREVENTIVE)
    description      = models.TextField(blank=True, default="")
    cost             = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    performed_by     = models.CharField(max_length=120, blank=True, default="")
    next_due_date    = models.DateField(null=True, blank=True)
    notes            = models.TextField(blank=True, default="")
    logged_by        = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="logged_maintenance"
    )

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes  = [models.Index(fields=["asset", "-date"])]

    def __str__(self):
        return f"{self.asset.asset_tag} {self.maintenance_type} {self.date}"


class InventoryRequest(TimestampedModel):
    class ReqType(models.TextChoices):
        ASSET_REQUEST     = "ASSET_REQUEST",     "Asset Request"
        CONSUMABLE_RESTOCK= "CONSUMABLE_RESTOCK","Consumable Restock"
        REPORT_ISSUE      = "REPORT_ISSUE",      "Report Issue"
        CHECKOUT          = "CHECKOUT",          "Asset Checkout"
        RETURN            = "RETURN",            "Asset Return"

    class Status(models.TextChoices):
        PENDING  = "PENDING",  "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        CLOSED   = "CLOSED",   "Closed"

    request_type = models.CharField(max_length=30, choices=ReqType.choices)
    status       = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)

    # Requestor
    requested_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="inventory_requests"
    )
    department   = models.ForeignKey(
        "core.Department", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="inventory_requests"
    )

    # Optional FK to an existing asset (for REPORT_ISSUE / CHECKOUT / RETURN)
    asset        = models.ForeignKey(
        Asset, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="requests"
    )

    # Human-readable description / details
    title        = models.CharField(max_length=200)
    description  = models.TextField(blank=True, default="")
    quantity     = models.PositiveIntegerField(default=1)

    # Admin resolution
    resolved_by  = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="resolved_requests"
    )
    admin_notes  = models.TextField(blank=True, default="")
    resolved_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes  = [models.Index(fields=["status", "-created_at"])]

    def __str__(self):
        return f"{self.request_type} [{self.status}] by {self.requested_by}"


class AuditLog(models.Model):
    class EntityType(models.TextChoices):
        ASSET       = "ASSET",       "Asset"
        CONSUMABLE  = "CONSUMABLE",  "Consumable"
        MAINTENANCE = "MAINTENANCE", "Maintenance Record"
        REQUEST     = "REQUEST",     "Inventory Request"

    class Action(models.TextChoices):
        CREATE = "CREATE", "Create"
        UPDATE = "UPDATE", "Update"
        DELETE = "DELETE", "Delete"

    timestamp = models.DateTimeField(auto_now_add=True)

    entity_type = models.CharField(max_length=32, choices=EntityType.choices, db_index=True)
    entity_id = models.CharField(max_length=64)  # store pk as string to be safe

    action = models.CharField(max_length=16, choices=Action.choices, db_index=True)
    summary = models.CharField(max_length=255, blank=True, default="")

    # Who did it
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
    )

    # Department scoping (important for non-admin visibility)
    department = models.ForeignKey(
        Department,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
    )

    # Store changes as JSON
    before = models.JSONField(null=True, blank=True)
    after = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ["-timestamp"]

    def save(self, *args, **kwargs):
        if self.pk:
            raise RuntimeError(
                "AuditLog records are immutable — updates are not permitted. "
                "Create a new record instead."
            )
        super().save(*args, **kwargs)

    def delete(self, using=None, keep_parents=False):
        raise RuntimeError(
            "AuditLog records cannot be deleted — the audit trail must remain intact."
        )

    def __str__(self):
        return f"[{self.timestamp}] {self.entity_type} {self.action} {self.entity_id}"