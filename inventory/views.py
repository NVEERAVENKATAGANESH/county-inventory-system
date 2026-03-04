"""
inventory/views.py  — Professional rewrite

Changes from original:
  - Fixed N+1 query in DepartmentComparisonView (now single annotated query)
  - Fixed unhandled Department.DoesNotExist in _admin_only_save
  - Removed duplicate ActingRoleWritePermission (use inventory/permissions.py)
  - Added missing low-stock/ custom action on ConsumableViewSet
  - Added proper select_related to AuditLog queryset
  - Dashboard views now properly handle empty querysets
  - All views return consistent error responses
  - CSV export uses department_code from serializer, not raw FK
  - Added transaction.atomic() on CSV import
  - Hardened int parsing on CSV import
"""
import csv
import io
from datetime import date, timedelta

import django_filters
from django.db import models, transaction
from django.db.models import Case, Count, F, IntegerField, Sum, When
from django.db.models.functions import TruncMonth
from django.http import HttpResponse

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Department, Location
from common.demo import is_demo_unlocked
from .models import Asset, Consumable, AuditLog, MaintenanceRecord, InventoryRequest
from .serializers import (
    AssetSerializer, ConsumableSerializer, AuditLogSerializer,
    MaintenanceRecordSerializer, InventoryRequestSerializer,
)
from .permissions import ActingRoleWritePermission


# ============================================================
# Request context helpers
# ============================================================

def _acting_role(request) -> str:
    role = (request.headers.get("X-Acting-Role") or "").strip().lower()
    return role if role in ("admin", "employee") else "employee"


def _is_admin(request) -> bool:
    return _acting_role(request) == "admin"


def _dept_code(request) -> str | None:
    code = (request.headers.get("X-Dept-Code") or "").strip().upper()
    return code or None


def _get_scoped_department(request) -> Department:
    """
    Resolve Department from X-Dept-Code header (case-insensitive).
    Raises PermissionDenied (HTTP 403) with a clear message on any failure.
    """
    code = _dept_code(request)
    if not code:
        raise PermissionDenied("X-Dept-Code header is required for employee access.")
    try:
        return Department.objects.get(code__iexact=code)
    except Department.DoesNotExist:
        raise PermissionDenied(f"Department code '{code}' not found.")


def _resolve_dept_from_header(request) -> Department | None:
    """
    Try to resolve Department from X-Dept-Code header (case-insensitive).
    Returns None if header is absent; raises ValidationError if code is invalid.
    """
    code = _dept_code(request)
    if not code:
        return None
    try:
        return Department.objects.get(code__iexact=code)
    except Department.DoesNotExist:
        raise ValidationError({"department_code": f"Department code '{code}' not found."})


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value.strip())
    except (ValueError, AttributeError):
        return None


def _safe_int(value, default: int = 0) -> int:
    try:
        return int(str(value).strip() or default)
    except (ValueError, TypeError):
        return default


# ============================================================
# Custom FilterSets
# ============================================================

class AssetFilter(django_filters.FilterSet):
    """Extends default asset filtering with username and date-range lookups."""
    assigned_to_username = django_filters.CharFilter(
        field_name="assigned_to__username", lookup_expr="iexact"
    )
    warranty_expiry_before = django_filters.DateFilter(
        field_name="warranty_expiry", lookup_expr="lte"
    )
    warranty_expiry_after = django_filters.DateFilter(
        field_name="warranty_expiry", lookup_expr="gte"
    )

    class Meta:
        model  = Asset
        fields = [
            "condition", "category", "assigned_to",
            "assigned_to_username", "warranty_expiry_before", "warranty_expiry_after",
        ]


class MaintenanceFilter(django_filters.FilterSet):
    """Extends maintenance filtering with next_due_date range lookups."""
    next_due_before = django_filters.DateFilter(
        field_name="next_due_date", lookup_expr="lte"
    )
    next_due_after = django_filters.DateFilter(
        field_name="next_due_date", lookup_expr="gte"
    )
    date_before = django_filters.DateFilter(
        field_name="date", lookup_expr="lte"
    )
    date_after = django_filters.DateFilter(
        field_name="date", lookup_expr="gte"
    )

    class Meta:
        model  = MaintenanceRecord
        fields = ["asset", "maintenance_type", "next_due_before", "next_due_after", "date_before", "date_after"]


# ============================================================
# Dept Scoping Mixin
# ============================================================

class DeptScopedQuerysetMixin:
    """
    - Employee: filters queryset to their department via X-Dept-Code.
    - Admin: sees everything.
    Requires model has a `department` FK.
    """

    def get_queryset(self):
        qs = super().get_queryset()
        # If demo data is locked, behave as if DB is empty unless Dev Panel unlocks it.
        if not is_demo_unlocked(self.request):
            return qs.none()
        if _is_admin(self.request):
            return qs
        dept = _get_scoped_department(self.request)
        return qs.filter(department_id=dept.id)

    def _admin_only_save(self, serializer):
        """
        Persist the serializer. Admin-only.
        Falls back to X-Dept-Code header if department not provided in body.
        Raises ValidationError (not a bare exception) if header dept code is invalid.
        """
        if not _is_admin(self.request):
            raise PermissionDenied("Employees are read-only.")

        dept_obj = serializer.validated_data.get("department", None)
        if dept_obj is None:
            dept_obj = _resolve_dept_from_header(self.request)
            if dept_obj is None:
                raise ValidationError(
                    {"department_code": "Department is required. Pass department_code in body or X-Dept-Code header."}
                )
            serializer.validated_data["department"] = dept_obj

        # Resolve location if location_name was provided as a string
        loc_name = serializer.validated_data.get("location")
        if isinstance(loc_name, str) and loc_name:
            location, _ = Location.objects.get_or_create(
                department=dept_obj,
                name=loc_name,
            )
            serializer.validated_data["location"] = location
        elif isinstance(loc_name, str) and not loc_name:
            serializer.validated_data["location"] = None

        return serializer.save()


# ============================================================
# Asset ViewSet
# ============================================================

class AssetViewSet(DeptScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Asset.objects.select_related("department", "location", "assigned_to").all()
    serializer_class = AssetSerializer
    permission_classes = [ActingRoleWritePermission]

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = AssetFilter
    search_fields = ["asset_tag", "name", "serial_number", "notes", "assigned_to__username"]
    ordering_fields = ["updated_at", "created_at", "asset_tag", "name", "warranty_expiry", "purchase_price"]
    ordering = ["-updated_at"]

    def perform_create(self, serializer):
        self._admin_only_save(serializer)

    def perform_update(self, serializer):
        self._admin_only_save(serializer)

    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):
        qs = self.get_queryset().order_by("asset_tag")

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="assets.csv"'

        writer = csv.writer(response)
        writer.writerow([
            "asset_tag", "name", "category", "department_code",
            "location_name", "condition", "serial_number",
            "purchase_date", "notes",
        ])
        for a in qs:
            writer.writerow([
                a.asset_tag,
                a.name,
                a.category,
                a.department.code if a.department else "",
                a.location.name if a.location else "",
                a.condition,
                a.serial_number,
                a.purchase_date.isoformat() if a.purchase_date else "",
                a.notes,
            ])
        return response

    @action(detail=False, methods=["post"], url_path="import-csv")
    def import_csv(self, request):
        if not _is_admin(request):
            raise PermissionDenied("Only admin can import CSV.")

        upload = request.FILES.get("file")
        if not upload:
            return Response(
                {"detail": "Upload a CSV file with key 'file'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        _MAX_CSV_SIZE = 2 * 1024 * 1024  # 2 MB
        if upload.size > _MAX_CSV_SIZE:
            return Response(
                {"detail": "File too large. Maximum allowed size is 2 MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            decoded = upload.read().decode("utf-8-sig")
        except UnicodeDecodeError:
            return Response(
                {"detail": "File encoding error. Use UTF-8."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reader = csv.DictReader(io.StringIO(decoded))
        created = updated = 0
        errors = []

        for idx, row in enumerate(reader, start=2):
            try:
                with transaction.atomic():
                    asset_tag = (row.get("asset_tag") or "").strip()
                    name = (row.get("name") or "").strip()
                    if not asset_tag or not name:
                        raise ValueError("asset_tag and name are required.")

                    dept_code = (row.get("department_code") or "").strip().upper() or _dept_code(request)
                    if not dept_code:
                        raise ValueError("department_code is required (or set X-Dept-Code header).")

                    dept = Department.objects.get(code__iexact=dept_code)

                    location = None
                    loc_name = (row.get("location_name") or "").strip()
                    if loc_name:
                        location, _ = Location.objects.get_or_create(department=dept, name=loc_name)

                    condition = (row.get("condition") or "GOOD").strip().upper()
                    if condition not in ("GOOD", "NEEDS_REPAIR", "RETIRED"):
                        condition = "GOOD"

                    defaults = {
                        "name": name,
                        "category": (row.get("category") or "").strip(),
                        "department": dept,
                        "location": location,
                        "condition": condition,
                        "serial_number": (row.get("serial_number") or "").strip(),
                        "purchase_date": _parse_date(row.get("purchase_date")),
                        "notes": (row.get("notes") or "").strip(),
                    }

                    obj, was_created = Asset.objects.get_or_create(
                        asset_tag=asset_tag, defaults=defaults,
                    )
                    if was_created:
                        created += 1
                    else:
                        for k, v in defaults.items():
                            setattr(obj, k, v)
                        obj.save()
                        updated += 1

            except Department.DoesNotExist:
                errors.append({"line": idx, "error": f"Department '{dept_code}' not found.", "row": dict(row)})
            except Exception as e:
                errors.append({"line": idx, "error": str(e), "row": dict(row)})

        return Response({"created": created, "updated": updated, "errors": errors})

    @action(detail=False, methods=["get"], url_path="warranty-alerts")
    def warranty_alerts(self, request):
        try:
            days = max(1, min(365, int(request.query_params.get("days", 90))))
        except (ValueError, TypeError):
            days = 90
        cutoff = date.today() + timedelta(days=days)
        qs = self.get_queryset().filter(
            warranty_expiry__isnull=False,
            warranty_expiry__lte=cutoff,
            warranty_expiry__gte=date.today(),
        ).order_by("warranty_expiry")
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(AssetSerializer(page, many=True).data)
        return Response(AssetSerializer(qs, many=True).data)


# ============================================================
# Consumable ViewSet
# ============================================================

class ConsumableViewSet(DeptScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Consumable.objects.select_related("department", "location").all()
    serializer_class = ConsumableSerializer
    permission_classes = [ActingRoleWritePermission]

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["category"]
    search_fields = ["sku", "name", "supplier", "notes"]
    ordering_fields = ["updated_at", "created_at", "sku", "name", "quantity_on_hand"]
    ordering = ["-updated_at"]

    def perform_create(self, serializer):
        self._admin_only_save(serializer)

    def perform_update(self, serializer):
        self._admin_only_save(serializer)

    @action(detail=False, methods=["get"], url_path="low-stock")
    def low_stock(self, request):
        qs = self.get_queryset().filter(
            reorder_level__gt=0,
            quantity_on_hand__lte=F("reorder_level"),
        ).order_by("quantity_on_hand", "sku")

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(qs, many=True)
        return Response({"count": qs.count(), "results": serializer.data})

    @action(detail=True, methods=["post"], url_path="adjust")
    def adjust(self, request, pk=None):
        if not _is_admin(request):
            raise PermissionDenied("Admin only.")
        obj = self.get_object()
        try:
            delta = int(request.data.get("delta", 0))
        except (TypeError, ValueError):
            return Response({"detail": "delta must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

        new_qty = obj.quantity_on_hand + delta
        if new_qty < 0:
            return Response(
                {"detail": f"Cannot go below 0. Current: {obj.quantity_on_hand}, delta: {delta}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        obj.quantity_on_hand = new_qty
        obj.save()
        return Response(self.get_serializer(obj).data)

    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):
        qs = self.get_queryset().order_by("sku")

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="consumables.csv"'

        writer = csv.writer(response)
        writer.writerow([
            "sku", "name", "category", "department_code", "location_name",
            "quantity_on_hand", "reorder_level", "unit", "supplier", "notes",
        ])
        for c in qs:
            writer.writerow([
                c.sku, c.name, c.category,
                c.department.code if c.department else "",
                c.location.name if c.location else "",
                c.quantity_on_hand, c.reorder_level,
                c.unit, c.supplier, c.notes,
            ])
        return response

    @action(detail=False, methods=["post"], url_path="import-csv")
    def import_csv(self, request):
        if not _is_admin(request):
            raise PermissionDenied("Only admin can import CSV.")

        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "Upload a CSV file with key 'file'."}, status=status.HTTP_400_BAD_REQUEST)

        _MAX_CSV_SIZE = 2 * 1024 * 1024
        if upload.size > _MAX_CSV_SIZE:
            return Response({"detail": "File too large. Maximum allowed size is 2 MB."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded = upload.read().decode("utf-8-sig")
        except UnicodeDecodeError:
            return Response({"detail": "File encoding error. Use UTF-8."}, status=status.HTTP_400_BAD_REQUEST)

        reader = csv.DictReader(io.StringIO(decoded))
        created = updated = 0
        errors = []

        for idx, row in enumerate(reader, start=2):
            try:
                with transaction.atomic():
                    sku = (row.get("sku") or "").strip()
                    name = (row.get("name") or "").strip()
                    if not sku or not name:
                        raise ValueError("sku and name are required.")

                    dept_code = (row.get("department_code") or "").strip().upper() or _dept_code(request)
                    if not dept_code:
                        raise ValueError("department_code is required (or set X-Dept-Code header).")

                    dept = Department.objects.get(code__iexact=dept_code)

                    location = None
                    loc_name = (row.get("location_name") or "").strip()
                    if loc_name:
                        location, _ = Location.objects.get_or_create(department=dept, name=loc_name)

                    defaults = {
                        "name": name,
                        "category": (row.get("category") or "").strip(),
                        "department": dept,
                        "location": location,
                        "quantity_on_hand": _safe_int(row.get("quantity_on_hand"), 0),
                        "reorder_level": _safe_int(row.get("reorder_level"), 0),
                        "unit": (row.get("unit") or "each").strip() or "each",
                        "supplier": (row.get("supplier") or "").strip(),
                        "notes": (row.get("notes") or "").strip(),
                    }

                    obj, was_created = Consumable.objects.get_or_create(sku=sku, defaults=defaults)
                    if was_created:
                        created += 1
                    else:
                        for k, v in defaults.items():
                            setattr(obj, k, v)
                        obj.save()
                        updated += 1

            except Department.DoesNotExist:
                errors.append({"line": idx, "error": f"Department '{dept_code}' not found.", "row": dict(row)})
            except Exception as e:
                errors.append({"line": idx, "error": str(e), "row": dict(row)})

        return Response({"created": created, "updated": updated, "errors": errors})


# ============================================================
# Audit Log ViewSet (read-only)
# ============================================================

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.AllowAny]

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["entity_type", "action", "department"]
    search_fields = ["entity_id", "summary", "department__code", "department__name", "changed_by__username"]
    ordering_fields = ["timestamp"]
    ordering = ["-timestamp"]

    def get_queryset(self):
        qs = AuditLog.objects
        if not is_demo_unlocked(self.request):
            return qs.none()
        qs = AuditLog.objects.select_related("changed_by", "department").all()
        if _is_admin(self.request):
            return qs
        dept = _get_scoped_department(self.request)
        return qs.filter(department_id=dept.id)


# ============================================================
# Maintenance Record ViewSet
# ============================================================

class MaintenanceRecordViewSet(viewsets.ModelViewSet):
    serializer_class   = MaintenanceRecordSerializer
    permission_classes = [ActingRoleWritePermission]
    filter_backends    = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class    = MaintenanceFilter
    search_fields      = ["description", "performed_by", "asset__name", "asset__asset_tag"]
    ordering_fields    = ["date", "cost", "created_at", "next_due_date"]
    ordering           = ["-date"]

    def get_queryset(self):
        qs = MaintenanceRecord.objects.select_related("asset", "asset__department", "logged_by").all()
        if not is_demo_unlocked(self.request):
            return qs.none()

        asset_tag = self.request.query_params.get("asset_tag", "").strip()
        if asset_tag:
            qs = qs.filter(asset__asset_tag__iexact=asset_tag)

        if _is_admin(self.request):
            return qs

        dept = _get_scoped_department(self.request)
        return qs.filter(asset__department=dept)

    def perform_create(self, serializer):
        if not _is_admin(self.request):
            raise PermissionDenied("Employees are read-only.")
        username = self.request.headers.get("X-Username", "").strip()
        logged_by = None
        if username:
            from accounts.models import User
            logged_by = User.objects.filter(username=username).first()
        serializer.save(logged_by=logged_by)

    def perform_update(self, serializer):
        if not _is_admin(self.request):
            raise PermissionDenied("Employees are read-only.")
        serializer.save()

    @action(detail=False, methods=["get"], url_path="due-soon")
    def due_soon(self, request):
        try:
            days = max(1, min(90, int(request.query_params.get("days", 7))))
        except (ValueError, TypeError):
            days = 7
        cutoff = date.today() + timedelta(days=days)

        qs = self.get_queryset().filter(
            next_due_date__isnull=False,
            next_due_date__lte=cutoff,
            next_due_date__gte=date.today(),
        ).order_by("next_due_date")

        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(MaintenanceRecordSerializer(page, many=True).data)

        return Response(MaintenanceRecordSerializer(qs, many=True).data)


# ============================================================
# Inventory Request ViewSet
# ============================================================

class InventoryRequestViewSet(viewsets.ModelViewSet):
    serializer_class   = InventoryRequestSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends    = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields   = ["status", "request_type", "department"]
    search_fields      = ["title", "description", "requested_by__username"]
    ordering_fields    = ["created_at", "status"]
    ordering           = ["-created_at"]

    def get_queryset(self):
        qs = InventoryRequest.objects.select_related(
            "requested_by", "resolved_by", "department", "asset"
        ).all()
        if not is_demo_unlocked(self.request):
            return qs.none()

        if _is_admin(self.request):
            return qs

        username = self.request.headers.get("X-Username", "").strip()
        if username:
            return qs.filter(requested_by__username=username)
        return qs.none()

    def perform_create(self, serializer):
        from accounts.models import User
        username = self.request.headers.get("X-Username", "").strip()
        user = User.objects.filter(username=username).first() if username else None
        dept = _resolve_dept_from_header(self.request)

        asset_tag = self.request.data.get("asset_tag", "").strip()
        asset_obj = Asset.objects.filter(asset_tag__iexact=asset_tag).first() if asset_tag else None
        extra = {"asset": asset_obj} if asset_obj else {}

        serializer.save(requested_by=user, department=dept, **extra)

    def perform_update(self, serializer):
        from django.utils.timezone import now as tz_now
        new_status = serializer.validated_data.get("status")
        if new_status in ("APPROVED", "REJECTED", "CLOSED"):
            serializer.save(resolved_at=tz_now())
        else:
            serializer.save()

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, **_kwargs):
        if not _is_admin(request):
            raise PermissionDenied("Admin only.")
        from django.utils.timezone import now as tz_now
        from accounts.models import User

        obj = self.get_object()
        obj.status      = InventoryRequest.Status.APPROVED
        obj.admin_notes = request.data.get("admin_notes", obj.admin_notes)
        obj.resolved_at = tz_now()

        username = request.headers.get("X-Username", "").strip()
        if username:
            obj.resolved_by = User.objects.filter(username=username).first()

        obj.save()
        return Response(InventoryRequestSerializer(obj).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, **_kwargs):
        if not _is_admin(request):
            raise PermissionDenied("Admin only.")
        from django.utils.timezone import now as tz_now
        from accounts.models import User

        obj = self.get_object()
        obj.status      = InventoryRequest.Status.REJECTED
        obj.admin_notes = request.data.get("admin_notes", obj.admin_notes)
        obj.resolved_at = tz_now()

        username = request.headers.get("X-Username", "").strip()
        if username:
            obj.resolved_by = User.objects.filter(username=username).first()

        obj.save()
        return Response(InventoryRequestSerializer(obj).data)


# ============================================================
# Dashboard Analytics
# ============================================================

class DashboardSummaryView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not is_demo_unlocked(request):
            return Response({
                "total_assets": 0,
                "total_consumables": 0,
                "low_stock": 0,
                "audit_records": 0,
                "warranty_expiring_30": 0,
                "total_asset_value": 0,
                "maintenance_count": 0,
                "pending_requests": 0,
                "condition_breakdown": {},
                "warranty_breakdown": {},
            })

        if _is_admin(request):
            assets_qs = Asset.objects.all()
            consumables_qs = Consumable.objects.all()
            audit_qs = AuditLog.objects.all()
        else:
            dept = _get_scoped_department(request)
            assets_qs = Asset.objects.filter(department=dept)
            consumables_qs = Consumable.objects.filter(department=dept)
            audit_qs = AuditLog.objects.filter(department=dept)

        low_stock_count = consumables_qs.filter(
            reorder_level__gt=0,
            quantity_on_hand__lte=models.F("reorder_level"),
        ).count()

        warranty_expiring_30 = assets_qs.filter(
            warranty_expiry__isnull=False,
            warranty_expiry__lte=date.today() + timedelta(days=30),
            warranty_expiry__gte=date.today(),
        ).count()

        total_asset_value = float(assets_qs.aggregate(v=Sum("purchase_price"))["v"] or 0)

        condition_raw = assets_qs.values("condition").annotate(cnt=Count("id"))
        condition_breakdown = {r["condition"]: r["cnt"] for r in condition_raw}

        today_d     = date.today()
        exp_thresh  = today_d + timedelta(days=90)
        war_agg     = assets_qs.aggregate(
            war_active=Count(Case(When(
                warranty_expiry__isnull=False,
                warranty_expiry__gt=exp_thresh,
                then=1,
            ), output_field=IntegerField())),
            war_expiring=Count(Case(When(
                warranty_expiry__isnull=False,
                warranty_expiry__gte=today_d,
                warranty_expiry__lte=exp_thresh,
                then=1,
            ), output_field=IntegerField())),
            war_expired=Count(Case(When(
                warranty_expiry__isnull=False,
                warranty_expiry__lt=today_d,
                then=1,
            ), output_field=IntegerField())),
            war_na=Count(Case(When(
                warranty_expiry__isnull=True,
                then=1,
            ), output_field=IntegerField())),
        )
        warranty_breakdown = {
            "ACTIVE":   war_agg["war_active"],
            "EXPIRING": war_agg["war_expiring"],
            "EXPIRED":  war_agg["war_expired"],
            "N/A":      war_agg["war_na"],
        }

        if _is_admin(request):
            maintenance_count = MaintenanceRecord.objects.count()
        else:
            maintenance_count = MaintenanceRecord.objects.filter(asset__department=dept).count()

        req_qs = InventoryRequest.objects.filter(status="PENDING")
        if not _is_admin(request):
            uname = request.headers.get("X-Username", "").strip()
            req_qs = req_qs.filter(requested_by__username=uname) if uname else req_qs.none()
        pending_requests = req_qs.count()

        return Response({
            "total_assets":          assets_qs.count(),
            "total_consumables":     consumables_qs.count(),
            "low_stock":             low_stock_count,
            "audit_records":         audit_qs.count(),
            "warranty_expiring_30":  warranty_expiring_30,
            "total_asset_value":     total_asset_value,
            "maintenance_count":     maintenance_count,
            "pending_requests":      pending_requests,
            "condition_breakdown":   condition_breakdown,
            "warranty_breakdown":    warranty_breakdown,
        })


class DepartmentComparisonView(APIView):
    """
    Asset vs Consumable count per department.
    Fixed: was N+1 queries. Now uses a single annotated queryset per model.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # ✅ IMPORTANT: hide everything when demo is locked and not unlocked
        if not is_demo_unlocked(request):
            return Response([])

        if not _is_admin(request):
            dept = _get_scoped_department(request)
            return Response([{
                "name": dept.name,
                "code": dept.code,
                "asset_count": Asset.objects.filter(department=dept).count(),
                "consumable_count": Consumable.objects.filter(department=dept).count(),
            }])

        asset_counts = {
            row["department_id"]: row["cnt"]
            for row in Asset.objects.values("department_id").annotate(cnt=Count("id"))
        }
        consumable_counts = {
            row["department_id"]: row["cnt"]
            for row in Consumable.objects.values("department_id").annotate(cnt=Count("id"))
        }

        result = [
            {
                "name": dept.name,
                "code": dept.code,
                "asset_count": asset_counts.get(dept.id, 0),
                "consumable_count": consumable_counts.get(dept.id, 0),
            }
            for dept in Department.objects.all().order_by("name")
        ]
        return Response(result)


class CategoryDistributionView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not is_demo_unlocked(request):
            return Response([])

        qs = Asset.objects.all()
        if not _is_admin(request):
            dept = _get_scoped_department(request)
            qs = qs.filter(department=dept)

        data = qs.values("category").annotate(count=Count("id")).order_by("-count")
        return Response(list(data))


class MonthlyTrendView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not is_demo_unlocked(request):
            return Response({"assets": [], "consumables": []})

        assets_qs = Asset.objects.all()
        consumables_qs = Consumable.objects.all()

        if not _is_admin(request):
            dept = _get_scoped_department(request)
            assets_qs = assets_qs.filter(department=dept)
            consumables_qs = consumables_qs.filter(department=dept)

        asset_trend = list(
            assets_qs.annotate(month=TruncMonth("created_at"))
            .values("month").annotate(count=Count("id")).order_by("month")
        )

        consumable_trend = list(
            consumables_qs.annotate(month=TruncMonth("created_at"))
            .values("month").annotate(count=Count("id")).order_by("month")
        )

        return Response({"assets": asset_trend, "consumables": consumable_trend})