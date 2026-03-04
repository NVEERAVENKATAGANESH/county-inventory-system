from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter

from core.dev_views import dev_login, dev_status, dev_profile, dev_change_password, dev_users, dev_seed

from inventory.views import (
    AssetViewSet,
    ConsumableViewSet,
    AuditLogViewSet,
    MaintenanceRecordViewSet,
    InventoryRequestViewSet,
    DashboardSummaryView,
    DepartmentComparisonView,
    CategoryDistributionView,
    MonthlyTrendView,
)

from accounts.views import me, auth_login, change_password, UserViewSet
from core.views import DepartmentViewSet, LocationViewSet


def health(_request):
    return JsonResponse({"status": "ok"})


# ============================================================
# ROUTER
# ============================================================

router = DefaultRouter()
router.register(r"assets",      AssetViewSet,              basename="asset")
router.register(r"consumables", ConsumableViewSet,         basename="consumable")
router.register(r"auditlogs",   AuditLogViewSet,           basename="auditlog")
router.register(r"maintenance", MaintenanceRecordViewSet,  basename="maintenance")
router.register(r"requests",    InventoryRequestViewSet,   basename="inventoryrequest")
router.register(r"users",       UserViewSet,               basename="user")
router.register(r"departments", DepartmentViewSet,         basename="department")
router.register(r"locations",   LocationViewSet,           basename="location")


# ============================================================
# URL PATTERNS
# ============================================================

urlpatterns = [
    # Basic
    path("health/", health),
    path("admin/", admin.site.urls),

    # Dev endpoints (DevGate + DevPanel only)
    path("api/dev/login/",           dev_login),
    path("api/dev/status/",          dev_status),
    path("api/dev/profile/",         dev_profile),
    path("api/dev/change-password/", dev_change_password),
    path("api/dev/users/",           dev_users),
    path("api/dev/seed/",            dev_seed),

    # Dashboard analytics
    path("api/dashboard/summary/",     DashboardSummaryView.as_view()),
    path("api/dashboard/departments/", DepartmentComparisonView.as_view()),
    path("api/dashboard/categories/",  CategoryDistributionView.as_view()),
    path("api/dashboard/trends/",      MonthlyTrendView.as_view()),

    # Auth + session user
    path("api/auth/login/",           auth_login),
    path("api/auth/change-password/", change_password),
    path("api/me/",                   me),

    # CRUD router endpoints
    path("api/", include(router.urls)),

    # DRF browsable login
    path("api-auth/", include("rest_framework.urls")),
]