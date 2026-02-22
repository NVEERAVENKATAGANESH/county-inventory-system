import csv
import io
from datetime import date

from django.db import models
from django.http import HttpResponse

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from core.models import Department, Location
from .models import Asset, Consumable, AuditLog
from .serializers import AssetSerializer, ConsumableSerializer, AuditLogSerializer


# ============================================================
# Acting Role / Dept Scoping (NO AUTH)
# ============================================================

def _acting_role(request) -> str:
    """
    Header-based role:
      X-Acting-Role: admin | employee
    Defaults to employee.
    """
    role = (request.headers.get("X-Acting-Role") or "").strip().lower()
    return role if role in ("admin", "employee") else "employee"


def _is_admin(request) -> bool:
    return _acting_role(request) == "admin"


def _dept_code(request) -> str | None:
    """
    Employee requests must include:
      X-Dept-Code: <Department.code>  (e.g., IT, HR)
    Admin can omit it.
    """
    code = (request.headers.get("X-Dept-Code") or "").strip()
    return code or None


def _get_scoped_department(request) -> Department:
    """
    Returns Department for employee scope.
    """
    code = _dept_code(request)
    if not code:
        raise PermissionDenied("X-Dept-Code header is required for employee access.")
    try:
        return Department.objects.get(code=code)
    except Department.DoesNotExist:
        raise PermissionDenied(f"Invalid department code: {code}")


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    value = value.strip()
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except Exception:
        return None


# ============================================================
# Permissions
# ============================================================

class ActingRoleWritePermission(permissions.BasePermission):
    """
    No authentication.
    - SAFE methods: allowed for admin + employee
    - Writes: only admin
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return _is_admin(request)


# ============================================================
# Dept Scoping Mixin
# ============================================================

class DeptScopedQuerysetMixin:
    """
    Employee sees only their department based on X-Dept-Code.
    Admin sees all departments.
    Requires the model has `department` FK.
    """

    def get_queryset(self):
        qs = super().get_queryset()
        if _is_admin(self.request):
            return qs
        dept = _get_scoped_department(self.request)
        return qs.filter(department_id=dept.id)

    def _admin_only_save(self, serializer):
        """
        Writes are admin-only. Still enforce a sane department default:
        - If admin doesn't send department, we default to X-Dept-Code if present.
        """
        if not _is_admin(self.request):
            raise PermissionDenied("Employees are read-only.")

        dept_obj = serializer.validated_data.get("department", None)
        if dept_obj is None:
            code = _dept_code(self.request)
            if code:
                serializer.validated_data["department"] = Department.objects.get(code=code)

        return serializer.save()


# ============================================================
# Asset ViewSet
# ============================================================

class AssetViewSet(DeptScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Asset.objects.select_related("department", "location").all()
    serializer_class = AssetSerializer

    # No auth, but admin-only writes
    permission_classes = [permissions.AllowAny, ActingRoleWritePermission]

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["department", "location", "condition", "category"]
    search_fields = ["asset_tag", "name", "serial_number"]

    # ✅ Fix: remove "timestamp" (Asset doesn't have it)
    ordering_fields = ["updated_at", "created_at", "asset_tag", "name"]
    ordering = ["-updated_at", "asset_tag"]

    def perform_create(self, serializer):
        self._admin_only_save(serializer)

    def perform_update(self, serializer):
        self._admin_only_save(serializer)

    # -------------------------
    # CSV Export
    # -------------------------
    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):
        qs = self.get_queryset().order_by("asset_tag")

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="assets.csv"'

        writer = csv.writer(response)
        writer.writerow(
            [
                "asset_tag",
                "name",
                "category",
                "department_code",
                "location_name",
                "condition",
                "serial_number",
                "purchase_date",
                "notes",
            ]
        )

        for a in qs:
            writer.writerow(
                [
                    a.asset_tag,
                    a.name,
                    a.category,
                    a.department.code if a.department else "",
                    a.location.name if a.location else "",
                    a.condition,
                    a.serial_number,
                    a.purchase_date.isoformat() if a.purchase_date else "",
                    a.notes,
                ]
            )

        return response

    # -------------------------
    # CSV Import (Admin only)
    # -------------------------
    @action(detail=False, methods=["post"], url_path="import-csv")
    def import_csv(self, request):
        """
        Upload a CSV file as multipart/form-data with key `file`.
        Admin only.
        Required columns: asset_tag, name
        Optional: category, department_code, location_name, condition, serial_number, purchase_date, notes
        """
        if not _is_admin(request):
            raise PermissionDenied("Only admin can import CSV.")

        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "Upload CSV file with key 'file'."}, status=status.HTTP_400_BAD_REQUEST)

        decoded = upload.read().decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(decoded))

        created = 0
        updated = 0
        errors = []

        for idx, row in enumerate(reader, start=2):
            try:
                asset_tag = (row.get("asset_tag") or "").strip()
                name = (row.get("name") or "").strip()
                if not asset_tag or not name:
                    raise ValueError("asset_tag and name are required")

                category = (row.get("category") or "").strip()
                condition = ((row.get("condition") or "GOOD").strip() or "GOOD")
                serial_number = (row.get("serial_number") or "").strip()
                notes = (row.get("notes") or "").strip()

                dept_code = (row.get("department_code") or "").strip()
                if not dept_code:
                    header_code = _dept_code(request)
                    if not header_code:
                        raise ValueError("department_code is required (or set X-Dept-Code header).")
                    dept_code = header_code

                dept = Department.objects.get(code=dept_code)

                location = None
                loc_name = (row.get("location_name") or "").strip()
                if loc_name:
                    location, _ = Location.objects.get_or_create(department=dept, name=loc_name)

                purchase_date = _parse_date(row.get("purchase_date"))

                obj, was_created = Asset.objects.get_or_create(
                    asset_tag=asset_tag,
                    defaults={
                        "name": name,
                        "category": category,
                        "department": dept,
                        "location": location,
                        "condition": condition,
                        "serial_number": serial_number,
                        "notes": notes,
                        "purchase_date": purchase_date,
                    },
                )

                if was_created:
                    created += 1
                else:
                    obj.name = name
                    obj.category = category
                    obj.department = dept
                    obj.location = location
                    obj.condition = condition
                    obj.serial_number = serial_number
                    obj.notes = notes
                    obj.purchase_date = purchase_date
                    obj.save()
                    updated += 1

            except Exception as e:
                errors.append({"line": idx, "error": str(e), "row": row})

        return Response({"created": created, "updated": updated, "errors": errors})


# ============================================================
# Consumable ViewSet
# ============================================================

class ConsumableViewSet(DeptScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Consumable.objects.select_related("department", "location").all()
    serializer_class = ConsumableSerializer

    permission_classes = [permissions.AllowAny, ActingRoleWritePermission]

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["department", "location", "category"]
    search_fields = ["sku", "name", "supplier"]

    # ✅ Fix: remove "timestamp" (Consumable doesn't have it)
    ordering_fields = ["updated_at", "created_at", "sku", "name", "quantity_on_hand"]
    ordering = ["sku"]

    def perform_create(self, serializer):
        self._admin_only_save(serializer)

    def perform_update(self, serializer):
        self._admin_only_save(serializer)

    # -------------------------
    # Low stock endpoint (Dashboard)
    # -------------------------
    @action(detail=False, methods=["get"], url_path="low-stock")
    def low_stock(self, request):
        qs = self.get_queryset().filter(quantity_on_hand__lte=models.F("reorder_level")).order_by("name")
        return Response(
            {
                "count": qs.count(),
                "results": ConsumableSerializer(qs[:200], many=True).data,
            }
        )

    # -------------------------
    # CSV Export
    # -------------------------
    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):
        qs = self.get_queryset().order_by("sku")

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="consumables.csv"'

        writer = csv.writer(response)
        writer.writerow(
            [
                "sku",
                "name",
                "category",
                "department_code",
                "location_name",
                "quantity_on_hand",
                "reorder_level",
                "unit",
                "supplier",
                "notes",
            ]
        )

        for c in qs:
            writer.writerow(
                [
                    c.sku,
                    c.name,
                    c.category,
                    c.department.code if c.department else "",
                    c.location.name if c.location else "",
                    c.quantity_on_hand,
                    c.reorder_level,
                    c.unit,
                    c.supplier,
                    c.notes,
                ]
            )

        return response

    # -------------------------
    # CSV Import (Admin only)
    # -------------------------
    @action(detail=False, methods=["post"], url_path="import-csv")
    def import_csv(self, request):
        """
        Upload a CSV file as multipart/form-data with key `file`.
        Admin only.
        Required columns: sku, name
        Optional: category, department_code, location_name, quantity_on_hand, reorder_level, unit, supplier, notes
        """
        if not _is_admin(request):
            raise PermissionDenied("Only admin can import CSV.")

        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "Upload CSV file with key 'file'."}, status=status.HTTP_400_BAD_REQUEST)

        decoded = upload.read().decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(decoded))

        created = 0
        updated = 0
        errors = []

        for idx, row in enumerate(reader, start=2):
            try:
                sku = (row.get("sku") or "").strip()
                name = (row.get("name") or "").strip()
                if not sku or not name:
                    raise ValueError("sku and name are required")

                category = (row.get("category") or "").strip()
                supplier = (row.get("supplier") or "").strip()
                unit = ((row.get("unit") or "each").strip() or "each")
                notes = (row.get("notes") or "").strip()

                qoh = int(((row.get("quantity_on_hand") or "0").strip()) or "0")
                reorder = int(((row.get("reorder_level") or "0").strip()) or "0")

                dept_code = (row.get("department_code") or "").strip()
                if not dept_code:
                    header_code = _dept_code(request)
                    if not header_code:
                        raise ValueError("department_code is required (or set X-Dept-Code header).")
                    dept_code = header_code

                dept = Department.objects.get(code=dept_code)

                location = None
                loc_name = (row.get("location_name") or "").strip()
                if loc_name:
                    location, _ = Location.objects.get_or_create(department=dept, name=loc_name)

                obj, was_created = Consumable.objects.get_or_create(
                    sku=sku,
                    defaults={
                        "name": name,
                        "category": category,
                        "department": dept,
                        "location": location,
                        "quantity_on_hand": qoh,
                        "reorder_level": reorder,
                        "unit": unit,
                        "supplier": supplier,
                        "notes": notes,
                    },
                )

                if was_created:
                    created += 1
                else:
                    obj.name = name
                    obj.category = category
                    obj.department = dept
                    obj.location = location
                    obj.quantity_on_hand = qoh
                    obj.reorder_level = reorder
                    obj.unit = unit
                    obj.supplier = supplier
                    obj.notes = notes
                    obj.save()
                    updated += 1

            except Exception as e:
                errors.append({"line": idx, "error": str(e), "row": row})

        return Response({"created": created, "updated": updated, "errors": errors})


# ============================================================
# Audit Logs (Read-only)
# ============================================================

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only audit logs endpoint.
    - admin: sees all logs
    - employee: sees only dept logs based on X-Dept-Code
    """
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.AllowAny]

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["entity_type", "action", "changed_by", "department"]
    search_fields = [
        "entity_id",
        "summary",
        "department__code",
        "department__name",
        "changed_by__username",
    ]

    # ✅ AuditLog has timestamp (confirmed in your model)
    ordering_fields = ["timestamp"]
    ordering = ["-timestamp"]

    def get_queryset(self):
        qs = AuditLog.objects.select_related("changed_by", "department").all()

        if _is_admin(self.request):
            return qs.order_by("-timestamp")

        dept = _get_scoped_department(self.request)
        return qs.filter(department_id=dept.id).order_by("-timestamp")
