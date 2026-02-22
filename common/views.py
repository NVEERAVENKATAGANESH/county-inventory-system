from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response

from common.authentication import DevCodeAuthentication
from common.permissions import IsDeveloperCode


@api_view(["GET"])
@authentication_classes([DevCodeAuthentication])
@permission_classes([IsDeveloperCode])
def dev_status(request):
    return Response({"dev": True, "message": "Developer access granted"})
