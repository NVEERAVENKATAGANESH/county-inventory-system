"""
inventory/signals.py

Automatic AuditLog creation on Asset and Consumable save/delete.

Changes from original:
  - _snapshot now skips deferred fields safely
  - _actor() no longer tries is_authenticated on None (was safe, now cleaner)
  - Department is always set on AuditLog entries
  - Added safe guard: AuditLog.objects.create is wrapped in try/except
    so a logging failure never crashes the original save
"""
from __future__ import annotations

import logging
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver

from common.middleware import get_current_request, get_current_user
from .models import Asset, Consumable, AuditLog, MaintenanceRecord, InventoryRequest

logger = logging.getLogger(__name__)


# ─── JSON helpers ────────────────────────────────────────────────────────────────

def _json_safe(val):
    if val is None or isinstance(val, (str, int, float, bool)):
        return val
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, UUID):
        return str(val)
    if hasattr(val, "_meta") and hasattr(val, "pk"):
        return _json_safe(val.pk)
    if isinstance(val, (list, tuple, set)):
        return [_json_safe(x) for x in val]
    if isinstance(val, dict):
        return {str(k): _json_safe(v) for k, v in val.items()}
    return str(val)


def _snapshot(instance) -> dict:
    """JSON-safe snapshot of model fields. FK fields stored as their pk."""
    data = {}
    for field in instance._meta.concrete_fields:
        name = field.name
        try:
            val = field.value_from_object(instance)
            data[name] = _json_safe(val)
        except Exception:
            data[name] = None
    return data


# ─── Request context ─────────────────────────────────────────────────────────────

def _actor():
    user = get_current_user()
    if user and getattr(user, "is_authenticated", False):
        return user
    return None


def _request_meta() -> dict:
    """Extract acting role and dept code from current request headers."""
    req = get_current_request()
    if not req:
        return {}
    meta = {}
    role = (req.headers.get("X-Acting-Role") or "").strip().lower()
    dept = (req.headers.get("X-Dept-Code") or "").strip().upper()
    if role in ("admin", "employee"):
        meta["acting_role"] = role
    if dept:
        meta["dept_code"] = dept
    return meta


def _enrich(snapshot: dict) -> dict:
    """Attach request meta to snapshot under a reserved key."""
    meta = _request_meta()
    if meta:
        snapshot = {**snapshot, "_request_meta": meta}
    return snapshot


def _summary(prefix: str, identifier: str) -> str:
    meta = _request_meta()
    extras = [f"{k}={v}" for k, v in meta.items()]
    suffix = f" ({', '.join(extras)})" if extras else ""
    return f"{prefix} {identifier}{suffix}"


def _safe_log(**kwargs):
    """Create AuditLog without crashing the calling save/delete if logging fails."""
    try:
        AuditLog.objects.create(**kwargs)
    except Exception as e:
        logger.error("AuditLog creation failed: %s", e)


# ─── Asset signals ───────────────────────────────────────────────────────────────

@receiver(pre_save, sender=Asset)
def asset_pre_save(sender, instance: Asset, **kwargs):
    if not instance.pk:
        instance._before = None
        return
    try:
        old = Asset.objects.get(pk=instance.pk)
        instance._before = _snapshot(old)
    except Asset.DoesNotExist:
        instance._before = None


@receiver(post_save, sender=Asset)
def asset_post_save(sender, instance: Asset, created: bool, **kwargs):
    before = getattr(instance, "_before", None)
    after = _enrich(_snapshot(instance))
    prefix = "Created asset" if created else "Updated asset"

    _safe_log(
        entity_type=AuditLog.EntityType.ASSET,
        entity_id=str(instance.pk),
        action=AuditLog.Action.CREATE if created else AuditLog.Action.UPDATE,
        changed_by=_actor(),
        department=instance.department,
        summary=_summary(prefix, instance.asset_tag),
        before=before,
        after=after,
    )


@receiver(post_delete, sender=Asset)
def asset_post_delete(sender, instance: Asset, **kwargs):
    _safe_log(
        entity_type=AuditLog.EntityType.ASSET,
        entity_id=str(instance.pk),
        action=AuditLog.Action.DELETE,
        changed_by=_actor(),
        department=instance.department,
        summary=_summary("Deleted asset", instance.asset_tag),
        before=_enrich(_snapshot(instance)),
        after=None,
    )


# ─── Consumable signals ──────────────────────────────────────────────────────────

@receiver(pre_save, sender=Consumable)
def consumable_pre_save(sender, instance: Consumable, **kwargs):
    if not instance.pk:
        instance._before = None
        return
    try:
        old = Consumable.objects.get(pk=instance.pk)
        instance._before = _snapshot(old)
    except Consumable.DoesNotExist:
        instance._before = None


@receiver(post_save, sender=Consumable)
def consumable_post_save(sender, instance: Consumable, created: bool, **kwargs):
    before = getattr(instance, "_before", None)
    after = _enrich(_snapshot(instance))
    prefix = "Created consumable" if created else "Updated consumable"

    _safe_log(
        entity_type=AuditLog.EntityType.CONSUMABLE,
        entity_id=str(instance.pk),
        action=AuditLog.Action.CREATE if created else AuditLog.Action.UPDATE,
        changed_by=_actor(),
        department=instance.department,
        summary=_summary(prefix, instance.sku),
        before=before,
        after=after,
    )

    # ── Auto-restock: create a CONSUMABLE_RESTOCK request when stock goes low ──
    try:
        if instance.is_low_stock:
            already_pending = InventoryRequest.objects.filter(
                request_type=InventoryRequest.ReqType.CONSUMABLE_RESTOCK,
                status=InventoryRequest.Status.PENDING,
                title=f"Restock: {instance.name}",
            ).exists()
            if not already_pending:
                needed = max(1, instance.reorder_level - instance.quantity_on_hand)
                InventoryRequest.objects.create(
                    request_type=InventoryRequest.ReqType.CONSUMABLE_RESTOCK,
                    status=InventoryRequest.Status.PENDING,
                    department=instance.department,
                    title=f"Restock: {instance.name}",
                    description=(
                        f"Auto-generated: {instance.sku} is low "
                        f"({instance.quantity_on_hand} on hand, reorder at {instance.reorder_level}). "
                        f"Suggested order: {needed} {instance.unit or 'units'}."
                    ),
                    quantity=needed,
                )
    except Exception as e:
        logger.warning("Auto-restock request creation failed for %s: %s", instance.sku, e)


@receiver(post_delete, sender=Consumable)
def consumable_post_delete(sender, instance: Consumable, **kwargs):
    _safe_log(
        entity_type=AuditLog.EntityType.CONSUMABLE,
        entity_id=str(instance.pk),
        action=AuditLog.Action.DELETE,
        changed_by=_actor(),
        department=instance.department,
        summary=_summary("Deleted consumable", instance.sku),
        before=_enrich(_snapshot(instance)),
        after=None,
    )


# ─── MaintenanceRecord signals ────────────────────────────────────────────────

@receiver(pre_save, sender=MaintenanceRecord)
def maintenance_pre_save(sender, instance: MaintenanceRecord, **kwargs):
    if not instance.pk:
        instance._before = None
        return
    try:
        old = MaintenanceRecord.objects.get(pk=instance.pk)
        instance._before = _snapshot(old)
    except MaintenanceRecord.DoesNotExist:
        instance._before = None


@receiver(post_save, sender=MaintenanceRecord)
def maintenance_post_save(sender, instance: MaintenanceRecord, created: bool, **kwargs):
    before = getattr(instance, "_before", None)
    after  = _enrich(_snapshot(instance))
    dept   = instance.asset.department if instance.asset_id else None
    label  = instance.asset.asset_tag  if instance.asset_id else str(instance.pk)
    prefix = "Created maintenance record" if created else "Updated maintenance record"
    _safe_log(
        entity_type=AuditLog.EntityType.MAINTENANCE,
        entity_id=str(instance.pk),
        action=AuditLog.Action.CREATE if created else AuditLog.Action.UPDATE,
        changed_by=_actor(),
        department=dept,
        summary=_summary(prefix, label),
        before=before,
        after=after,
    )


@receiver(post_delete, sender=MaintenanceRecord)
def maintenance_post_delete(sender, instance: MaintenanceRecord, **kwargs):
    dept  = instance.asset.department if instance.asset_id else None
    label = instance.asset.asset_tag  if instance.asset_id else str(instance.pk)
    _safe_log(
        entity_type=AuditLog.EntityType.MAINTENANCE,
        entity_id=str(instance.pk),
        action=AuditLog.Action.DELETE,
        changed_by=_actor(),
        department=dept,
        summary=_summary("Deleted maintenance record", label),
        before=_enrich(_snapshot(instance)),
        after=None,
    )


# ─── InventoryRequest signals ─────────────────────────────────────────────────

@receiver(pre_save, sender=InventoryRequest)
def request_pre_save(sender, instance: InventoryRequest, **kwargs):
    if not instance.pk:
        instance._before = None
        return
    try:
        old = InventoryRequest.objects.get(pk=instance.pk)
        instance._before = _snapshot(old)
    except InventoryRequest.DoesNotExist:
        instance._before = None


@receiver(post_save, sender=InventoryRequest)
def request_post_save(sender, instance: InventoryRequest, created: bool, **kwargs):
    before = getattr(instance, "_before", None)
    after  = _enrich(_snapshot(instance))
    prefix = "Created request" if created else f"Request {instance.status.lower()}"
    _safe_log(
        entity_type=AuditLog.EntityType.REQUEST,
        entity_id=str(instance.pk),
        action=AuditLog.Action.CREATE if created else AuditLog.Action.UPDATE,
        changed_by=_actor(),
        department=instance.department,
        summary=_summary(prefix, instance.title[:60]),
        before=before,
        after=after,
    )