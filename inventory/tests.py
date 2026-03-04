"""
inventory/tests.py — Tests for inventory models, permissions, and API views.

Covers:
  - Consumable.is_low_stock property
  - ActingRoleWritePermission
  - Asset CRUD (list / create / delete, role-gated)
  - Consumable low-stock action + adjust action
  - Dashboard summary keys
  - InventoryRequest approve / reject
  - AuditLog signal creation on Asset + Consumable save
"""
import pytest
from rest_framework.test import APIClient, APIRequestFactory

from inventory.models import Asset, Consumable, AuditLog, InventoryRequest
from inventory.permissions import ActingRoleWritePermission


# ============================================================
# Model unit tests — no DB required
# ============================================================

class TestConsumableIsLowStock:
    """is_low_stock is a pure property — no DB needed."""

    def _make(self, qty, reorder):
        c = Consumable.__new__(Consumable)
        c.quantity_on_hand = qty
        c.reorder_level    = reorder
        return c

    def test_below_threshold_is_low(self):
        assert self._make(qty=2, reorder=5).is_low_stock is True

    def test_at_threshold_is_low(self):
        assert self._make(qty=5, reorder=5).is_low_stock is True

    def test_above_threshold_not_low(self):
        assert self._make(qty=10, reorder=5).is_low_stock is False

    def test_zero_threshold_never_low(self):
        """reorder_level=0 means no threshold set — never flag."""
        assert self._make(qty=0, reorder=0).is_low_stock is False

    def test_zero_qty_with_threshold_is_low(self):
        assert self._make(qty=0, reorder=1).is_low_stock is True


# ============================================================
# Permission unit tests — no DB required
# ============================================================

class TestActingRoleWritePermission:
    perm = ActingRoleWritePermission()

    def _req(self, method, role=None):
        factory = APIRequestFactory()
        req = getattr(factory, method)("/fake/")
        if role:
            req.META["HTTP_X_ACTING_ROLE"] = role
        return req

    def test_get_always_allowed(self):
        assert self.perm.has_permission(self._req("get"), None) is True

    def test_head_always_allowed(self):
        assert self.perm.has_permission(self._req("head"), None) is True

    def test_options_always_allowed(self):
        assert self.perm.has_permission(self._req("options"), None) is True

    def test_post_no_header_blocked(self):
        assert self.perm.has_permission(self._req("post"), None) is False

    def test_post_employee_blocked(self):
        assert self.perm.has_permission(self._req("post", role="employee"), None) is False

    def test_post_admin_allowed(self):
        assert self.perm.has_permission(self._req("post", role="admin"), None) is True

    def test_delete_admin_allowed(self):
        assert self.perm.has_permission(self._req("delete", role="admin"), None) is True

    def test_delete_employee_blocked(self):
        assert self.perm.has_permission(self._req("delete", role="employee"), None) is False

    def test_patch_admin_allowed(self):
        assert self.perm.has_permission(self._req("patch", role="admin"), None) is True


# ============================================================
# Asset API tests
# ============================================================

@pytest.mark.django_db
class TestAssetAPI:
    def setup_method(self):
        self.client = APIClient()

    def test_list_assets_admin_returns_200(self, asset):
        self.client.credentials(HTTP_X_ACTING_ROLE="admin")
        res = self.client.get("/api/assets/")
        assert res.status_code == 200

    def test_list_assets_admin_includes_fixture(self, asset):
        self.client.credentials(HTTP_X_ACTING_ROLE="admin")
        res = self.client.get("/api/assets/")
        tags = [a["asset_tag"] for a in res.json()["results"]]
        assert "TST-001" in tags

    def test_list_assets_employee_no_dept_returns_403(self):
        self.client.credentials(HTTP_X_ACTING_ROLE="employee")
        res = self.client.get("/api/assets/")
        assert res.status_code == 403

    def test_list_assets_employee_with_dept_returns_200(self, asset, department):
        self.client.credentials(HTTP_X_ACTING_ROLE="employee", HTTP_X_DEPT_CODE="FAC")
        res = self.client.get("/api/assets/")
        assert res.status_code == 200

    def test_list_assets_employee_scoped_to_dept(self, asset, department_it, db):
        """Employee FAC should not see assets from IT."""
        Asset.objects.create(asset_tag="IT-001", name="IT Server", department=department_it)
        self.client.credentials(HTTP_X_ACTING_ROLE="employee", HTTP_X_DEPT_CODE="FAC")
        res = self.client.get("/api/assets/")
        tags = [a["asset_tag"] for a in res.json()["results"]]
        assert "TST-001" in tags
        assert "IT-001" not in tags

    def test_create_asset_admin_returns_201(self, department):
        self.client.credentials(HTTP_X_ACTING_ROLE="admin")
        res = self.client.post(
            "/api/assets/",
            {"asset_tag": "NEW-001", "name": "New Desk", "department": department.id},
            format="json",
        )
        assert res.status_code == 201
        assert res.json()["asset_tag"] == "NEW-001"

    def test_create_asset_employee_returns_403(self, department):
        self.client.credentials(HTTP_X_ACTING_ROLE="employee", HTTP_X_DEPT_CODE="FAC")
        res = self.client.post(
            "/api/assets/",
            {"asset_tag": "EMP-001", "name": "Desk", "department": department.id},
            format="json",
        )
        assert res.status_code == 403

    def test_delete_asset_admin_returns_204(self, asset):
        self.client.credentials(HTTP_X_ACTING_ROLE="admin")
        res = self.client.delete(f"/api/assets/{asset.id}/")
        assert res.status_code == 204

    def test_delete_asset_employee_returns_403(self, asset):
        self.client.credentials(HTTP_X_ACTING_ROLE="employee", HTTP_X_DEPT_CODE="FAC")
        res = self.client.delete(f"/api/assets/{asset.id}/")
        assert res.status_code == 403

    def test_patch_asset_admin_returns_200(self, asset):
        self.client.credentials(HTTP_X_ACTING_ROLE="admin")
        res = self.client.patch(f"/api/assets/{asset.id}/", {"notes": "Updated"}, format="json")
        assert res.status_code == 200
        assert res.json()["notes"] == "Updated"


# ============================================================
# Consumable API tests
# ============================================================

@pytest.mark.django_db
class TestConsumableAPI:
    def setup_method(self):
        self.client = APIClient()
        self.client.credentials(HTTP_X_ACTING_ROLE="admin")

    def test_low_stock_action_returns_200(self):
        res = self.client.get("/api/consumables/low-stock/")
        assert res.status_code == 200

    def test_low_stock_action_includes_only_low_items(self, department, db):
        Consumable.objects.create(
            sku="LOW-001", name="Low Paper", department=department,
            quantity_on_hand=1, reorder_level=10,
        )
        Consumable.objects.create(
            sku="OK-001", name="OK Paper", department=department,
            quantity_on_hand=20, reorder_level=10,
        )
        res = self.client.get("/api/consumables/low-stock/")
        skus = [c["sku"] for c in res.json()["results"]]
        assert "LOW-001" in skus
        assert "OK-001" not in skus

    def test_low_stock_excludes_zero_threshold(self, department, db):
        Consumable.objects.create(
            sku="NOTHRESH-001", name="No Threshold", department=department,
            quantity_on_hand=0, reorder_level=0,
        )
        res = self.client.get("/api/consumables/low-stock/")
        skus = [c["sku"] for c in res.json()["results"]]
        assert "NOTHRESH-001" not in skus

    def test_adjust_add_returns_200(self, consumable):
        res = self.client.post(f"/api/consumables/{consumable.id}/adjust/", {"delta": 5}, format="json")
        assert res.status_code == 200
        assert res.json()["quantity_on_hand"] == 15

    def test_adjust_subtract_returns_200(self, consumable):
        res = self.client.post(f"/api/consumables/{consumable.id}/adjust/", {"delta": -3}, format="json")
        assert res.status_code == 200
        assert res.json()["quantity_on_hand"] == 7

    def test_adjust_below_zero_returns_400(self, consumable):
        res = self.client.post(f"/api/consumables/{consumable.id}/adjust/", {"delta": -999}, format="json")
        assert res.status_code == 400

    def test_adjust_employee_returns_403(self, consumable):
        self.client.credentials(HTTP_X_ACTING_ROLE="employee", HTTP_X_DEPT_CODE="FAC")
        res = self.client.post(f"/api/consumables/{consumable.id}/adjust/", {"delta": 1}, format="json")
        assert res.status_code == 403


# ============================================================
# Dashboard summary tests
# ============================================================

@pytest.mark.django_db
class TestDashboardSummary:
    def setup_method(self):
        self.client = APIClient()
        self.client.credentials(HTTP_X_ACTING_ROLE="admin")

    def test_summary_returns_200(self):
        res = self.client.get("/api/dashboard/summary/")
        assert res.status_code == 200

    def test_summary_has_required_keys(self):
        res = self.client.get("/api/dashboard/summary/")
        data = res.json()
        required = (
            "total_assets", "total_consumables", "low_stock_count",
            "total_asset_value", "warranty_expiring_30",
        )
        for key in required:
            assert key in data, f"Dashboard summary missing key: {key}"

    def test_summary_counts_reflect_data(self, asset, consumable):
        res = self.client.get("/api/dashboard/summary/")
        data = res.json()
        assert data["total_assets"] >= 1
        assert data["total_consumables"] >= 1


# ============================================================
# InventoryRequest approve / reject tests
# ============================================================

@pytest.mark.django_db
class TestInventoryRequestResolve:
    def setup_method(self):
        self.client = APIClient()

    def test_employee_can_create_request(self, department):
        self.client.credentials(HTTP_X_ACTING_ROLE="employee", HTTP_X_DEPT_CODE="FAC")
        res = self.client.post(
            "/api/requests/",
            {"request_type": "ASSET_REQUEST", "title": "Need a laptop", "quantity": 1},
            format="json",
        )
        assert res.status_code == 201

    def test_approve_sets_status_approved(self, pending_request):
        self.client.credentials(HTTP_X_ACTING_ROLE="admin")
        res = self.client.post(f"/api/requests/{pending_request.id}/approve/", {}, format="json")
        assert res.status_code == 200
        pending_request.refresh_from_db()
        assert pending_request.status == InventoryRequest.Status.APPROVED

    def test_approve_sets_resolved_at(self, pending_request):
        self.client.credentials(HTTP_X_ACTING_ROLE="admin")
        self.client.post(f"/api/requests/{pending_request.id}/approve/", {}, format="json")
        pending_request.refresh_from_db()
        assert pending_request.resolved_at is not None

    def test_reject_sets_status_rejected(self, pending_request):
        self.client.credentials(HTTP_X_ACTING_ROLE="admin")
        res = self.client.post(
            f"/api/requests/{pending_request.id}/reject/",
            {"admin_notes": "Not in budget"},
            format="json",
        )
        assert res.status_code == 200
        pending_request.refresh_from_db()
        assert pending_request.status == InventoryRequest.Status.REJECTED

    def test_reject_saves_admin_notes(self, pending_request):
        self.client.credentials(HTTP_X_ACTING_ROLE="admin")
        self.client.post(
            f"/api/requests/{pending_request.id}/reject/",
            {"admin_notes": "Over budget"},
            format="json",
        )
        pending_request.refresh_from_db()
        assert pending_request.admin_notes == "Over budget"

    def test_employee_cannot_approve(self, pending_request):
        self.client.credentials(HTTP_X_ACTING_ROLE="employee", HTTP_X_DEPT_CODE="FAC")
        res = self.client.post(f"/api/requests/{pending_request.id}/approve/", {}, format="json")
        assert res.status_code == 403


# ============================================================
# AuditLog signal tests
# ============================================================

@pytest.mark.django_db
class TestAuditLogSignals:
    def test_asset_create_generates_audit_log(self, department):
        before = AuditLog.objects.count()
        Asset.objects.create(asset_tag="AUD-001", name="Audit Laptop", department=department)
        assert AuditLog.objects.count() == before + 1

    def test_asset_create_log_action_is_create(self, department):
        Asset.objects.create(asset_tag="AUD-002", name="Audit Laptop 2", department=department)
        log = AuditLog.objects.filter(entity_type=AuditLog.EntityType.ASSET).latest("timestamp")
        assert log.action == AuditLog.Action.CREATE

    def test_asset_create_log_entity_type_is_asset(self, department):
        Asset.objects.create(asset_tag="AUD-003", name="Audit Laptop 3", department=department)
        log = AuditLog.objects.filter(entity_type=AuditLog.EntityType.ASSET).latest("timestamp")
        assert log.entity_type == AuditLog.EntityType.ASSET

    def test_consumable_create_generates_audit_log(self, department):
        before = AuditLog.objects.count()
        Consumable.objects.create(
            sku="AUD-SKU-001", name="Audit Paper", department=department,
        )
        assert AuditLog.objects.count() == before + 1

    def test_consumable_create_log_entity_type(self, department):
        Consumable.objects.create(sku="AUD-SKU-002", name="Audit Paper 2", department=department)
        log = AuditLog.objects.filter(entity_type=AuditLog.EntityType.CONSUMABLE).latest("timestamp")
        assert log.entity_type == AuditLog.EntityType.CONSUMABLE

    def test_asset_update_generates_audit_log(self, asset):
        before = AuditLog.objects.count()
        asset.notes = "Updated notes"
        asset.save()
        assert AuditLog.objects.count() == before + 1

    def test_asset_delete_generates_audit_log(self, asset):
        before = AuditLog.objects.count()
        asset.delete()
        assert AuditLog.objects.count() == before + 1

    def test_asset_delete_log_action_is_delete(self, asset, department):
        asset.delete()
        log = AuditLog.objects.filter(
            entity_type=AuditLog.EntityType.ASSET,
            action=AuditLog.Action.DELETE,
        ).latest("timestamp")
        assert log.action == AuditLog.Action.DELETE
