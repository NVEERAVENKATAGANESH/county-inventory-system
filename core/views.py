"""
core/views.py

DepartmentViewSet and LocationViewSet for /api/departments/ and /api/locations/.
"""
from django.db.models import Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets

from inventory.permissions import ActingRoleWritePermission
from common.demo import is_demo_unlocked

from .models import Department, Location
from .serializers import DepartmentSerializer, LocationSerializer


class DepartmentViewSet(viewsets.ModelViewSet):
    """
    CRUD for Department model.
    - GET: open (all portal users)
    - POST/PATCH/DELETE: admin only
    Annotates each department with asset_count and consumable_count.
    """
    serializer_class   = DepartmentSerializer
    permission_classes = [ActingRoleWritePermission]
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ["name", "code"]
    ordering_fields    = ["name", "code"]
    ordering           = ["name"]

    def get_queryset(self):
        if not is_demo_unlocked(self.request):
            return Department.objects.none()
        return (
            Department.objects
            .prefetch_related("locations")
            .annotate(
                asset_count=Count("assets", distinct=True),
                consumable_count=Count("consumables", distinct=True),
            )
            .order_by("name")
        )


class LocationViewSet(viewsets.ModelViewSet):
    """
    CRUD for Location model.
    - GET: open (all portal users); supports ?department=<id> filter
    - POST/PATCH/DELETE: admin only
    """
    serializer_class   = LocationSerializer
    permission_classes = [ActingRoleWritePermission]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ["department"]
    search_fields      = ["name", "address"]
    ordering_fields    = ["name"]
    ordering           = ["name"]

    def get_queryset(self):
        if not is_demo_unlocked(self.request):
            return Location.objects.none()
        return Location.objects.select_related("department").order_by("name")