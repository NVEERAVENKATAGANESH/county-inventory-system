from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver

from common.middleware import get_current_user
from .models import Asset, Consumable, AuditLog


# ============================================================
# JSON helpers
# ============================================================

def _json_safe(val):
    """
    Convert any Python/Django value into JSON-serializable value.
    """
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
    """
    Create a JSON-safe snapshot of a model instance.
    - FK fields stored as pk + also <field>_id for convenience.
    """
    data = {}
    for field in instance._meta.fields:
        name = field.name
        val = getattr(instance, name)

        if hasattr(val, "_meta") and hasattr(val, "pk"):
            pk = _json_safe(val.pk)
            data[name] = pk
            data[f"{name}_id"] = pk
        else:
            data[name] = _json_safe(val)
            if name.endswith("_id"):
                data[name] = _json_safe(val)

    return data


# ============================================================
# Actor / Request Context
# ============================================================

def _actor():
    """
    Get current user (from middleware) if authenticated.
    If no auth, returns None (that's OK).
    """
    user = get_current_user()
    if user and getattr(user, "is_authenticated", False):
        return user
    return None


def _request_headers() -> dict:
    """
    Best-effort extraction of request headers if your middleware stores the request.
    If your get_current_user() middleware doesn't store request, this returns {}.

    NOTE: If you want this to always work, update your middleware to store
    request in thread-local and provide get_current_request().
    """
    # If you have get_current_request in middleware, use it.
    try:
        from common.middleware import get_current_request  # type: ignore
        req = get_current_request()
        if not req:
            return {}
        # Django >= 2.2 exposes headers; otherwise fall back to META.
        try:
            return dict(req.headers)
        except Exception:
            return {k: v for k, v in req.META.items() if k.startswith("HTTP_")}
    except Exception:
        return {}


def _acting_role_from_headers(headers: dict) -> str | None:
    role = (headers.get("X-Acting-Role") or headers.get("HTTP_X_ACTING_ROLE") or "").strip().lower()
    if role in ("admin", "employee"):
        return role
    return None


def _dept_code_from_headers(headers: dict) -> str | None:
    code = (headers.get("X-Dept-Code") or headers.get("HTTP_X_DEPT_CODE") or "").strip()
    return code or None


def _enrich_after_snapshot(after: dict) -> dict:
    """
    Optionally enrich the "after" JSON with request context so you can debug
    who/what triggered changes even with no auth.
    """
    headers = _request_headers()
    role = _acting_role_from_headers(headers)
    dept_code = _dept_code_from_headers(headers)

    # Don't overwrite real model fields; store under a reserved key.
    meta = {}
    if role:
        meta["acting_role"] = role
    if dept_code:
        meta["dept_code"] = dept_code

    if meta:
        after = dict(after)  # copy
        after["_request_meta"] = meta

    return after


def _summary(prefix: str, identifier: str) -> str:
    """
    Human-readable summary. Adds role/dept if available.
    """
    headers = _request_headers()
    role = _acting_role_from_headers(headers)
    dept_code = _dept_code_from_headers(headers)

    extras = []
    if role:
        extras.append(f"role={role}")
    if dept_code:
        extras.append(f"dept={dept_code}")

    extra_text = f" ({', '.join(extras)})" if extras else ""
    return f"{prefix} {identifier}{extra_text}"


# ============================================================
# Asset audit
# ============================================================

@receiver(pre_save, sender=Asset)
def asset_pre_save(sender, instance: Asset, **kwargs):
    if not instance.pk:
        instance._asset_before_state = None
        return

    try:
        old = Asset.objects.get(pk=instance.pk)
        instance._asset_before_state = _snapshot(old)
    except Asset.DoesNotExist:
        instance._asset_before_state = None


@receiver(post_save, sender=Asset)
def asset_post_save(sender, instance: Asset, created: bool, **kwargs):
    before = getattr(instance, "_asset_before_state", None)
    after = _enrich_after_snapshot(_snapshot(instance))

    AuditLog.objects.create(
        entity_type=AuditLog.EntityType.ASSET,
        entity_id=str(instance.pk),
        action=AuditLog.Action.CREATE if created else AuditLog.Action.UPDATE,
        changed_by=_actor(),  # may be None (no auth)
        department=instance.department,  # keeps dept scoping correct
        summary=_summary("Created asset" if created else "Updated asset", instance.asset_tag),
        before=before,
        after=after,
    )


@receiver(post_delete, sender=Asset)
def asset_post_delete(sender, instance: Asset, **kwargs):
    before = _snapshot(instance)

    AuditLog.objects.create(
        entity_type=AuditLog.EntityType.ASSET,
        entity_id=str(instance.pk),
        action=AuditLog.Action.DELETE,
        changed_by=_actor(),
        department=instance.department,
        summary=_summary("Deleted asset", instance.asset_tag),
        before=_enrich_after_snapshot(before),
        after=None,
    )


# ============================================================
# Consumable audit
# ============================================================

@receiver(pre_save, sender=Consumable)
def consumable_pre_save(sender, instance: Consumable, **kwargs):
    if not instance.pk:
        instance._consumable_before_state = None
        return

    try:
        old = Consumable.objects.get(pk=instance.pk)
        instance._consumable_before_state = _snapshot(old)
    except Consumable.DoesNotExist:
        instance._consumable_before_state = None


@receiver(post_save, sender=Consumable)
def consumable_post_save(sender, instance: Consumable, created: bool, **kwargs):
    before = getattr(instance, "_consumable_before_state", None)
    after = _enrich_after_snapshot(_snapshot(instance))

    AuditLog.objects.create(
        entity_type=AuditLog.EntityType.CONSUMABLE,
        entity_id=str(instance.pk),
        action=AuditLog.Action.CREATE if created else AuditLog.Action.UPDATE,
        changed_by=_actor(),
        department=instance.department,
        summary=_summary("Created consumable" if created else "Updated consumable", instance.sku),
        before=before,
        after=after,
    )


@receiver(post_delete, sender=Consumable)
def consumable_post_delete(sender, instance: Consumable, **kwargs):
    before = _snapshot(instance)

    AuditLog.objects.create(
        entity_type=AuditLog.EntityType.CONSUMABLE,
        entity_id=str(instance.pk),
        action=AuditLog.Action.DELETE,
        changed_by=_actor(),
        department=instance.department,
        summary=_summary("Deleted consumable", instance.sku),
        before=_enrich_after_snapshot(before),
        after=None,
    )
