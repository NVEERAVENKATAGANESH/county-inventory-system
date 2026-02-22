from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission
from rest_framework.response import Response


class DevKeyPermission(BasePermission):
    def has_permission(self, request, view):
        return request.headers.get("X-Dev-Key", "") == settings.DEV_KEY


@api_view(["GET"])
@permission_classes([DevKeyPermission])
def dev_status(request):
    return Response({"message": "Dev access verified ✅"})
