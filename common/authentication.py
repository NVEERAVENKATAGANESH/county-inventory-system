import os
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

class DevCodeAuthentication(BaseAuthentication):
    def authenticate(self, request):
        provided = request.headers.get("X-DEV-CODE")

        # If header not sent, don't authenticate
        if not provided:
            return None

        expected = os.getenv("DEV_ACCESS_CODE")
        if not expected:
            raise AuthenticationFailed("DEV_ACCESS_CODE not configured")

        if provided != expected:
            raise AuthenticationFailed("Invalid developer code")

        return (None, "DEV_OK")
