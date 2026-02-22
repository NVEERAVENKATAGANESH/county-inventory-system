from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter

from inventory.views import AssetViewSet, ConsumableViewSet, AuditLogViewSet
from accounts.views import me

# ✅ SINGLE source of truth for dev status
from core.dev_views import dev_status


def health(_request):
    return JsonResponse({"status": "ok"})


router = DefaultRouter()
router.register(r"assets", AssetViewSet, basename="asset")
router.register(r"consumables", ConsumableViewSet, basename="consumable")
router.register(r"auditlogs", AuditLogViewSet, basename="auditlog")


urlpatterns = [
    path("health/", health),
    path("admin/", admin.site.urls),

    # ✅ Dev endpoint (used by React DevPanel)
    path("api/dev/status/", dev_status),

    # ✅ API
    path("api/", include(router.urls)),
    path("api/me/", me),
    path("api-auth/", include("rest_framework.urls")),
]
