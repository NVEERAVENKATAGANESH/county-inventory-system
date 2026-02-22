from django.conf import settings
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

    def __str__(self):
        return f"{self.asset_tag} - {self.name}"

class Consumable(TimestampedModel):
    sku = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=180)
    category = models.CharField(max_length=120, blank=True, default="")

    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="consumables")
    location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True, related_name="consumables")

    quantity_on_hand = models.IntegerField(default=0)
    reorder_level = models.IntegerField(default=0)

    unit = models.CharField(max_length=32, blank=True, default="each")
    supplier = models.CharField(max_length=120, blank=True, default="")
    notes = models.TextField(blank=True, default="")

    @property
    def is_low_stock(self) -> bool:
        return self.quantity_on_hand <= self.reorder_level

    def __str__(self):
        return f"{self.sku} - {self.name}"

class AuditLog(models.Model):
    class EntityType(models.TextChoices):
        ASSET = "ASSET", "Asset"
        CONSUMABLE = "CONSUMABLE", "Consumable"

    class Action(models.TextChoices):
        CREATE = "CREATE", "Create"
        UPDATE = "UPDATE", "Update"
        DELETE = "DELETE", "Delete"

    timestamp = models.DateTimeField(auto_now_add=True)

    entity_type = models.CharField(max_length=32, choices=EntityType.choices)
    entity_id = models.CharField(max_length=64)  # store pk as string to be safe

    action = models.CharField(max_length=16, choices=Action.choices)
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

    def __str__(self):
        return f"[{self.timestamp}] {self.entity_type} {self.action} {self.entity_id}"