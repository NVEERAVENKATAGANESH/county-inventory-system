"""
common/middleware.py

Thread-local request storage used by signals.py to get the current
user and request headers during model save/delete.

Thread-safe: uses threading.local() so concurrent requests don't interfere.
"""
import threading

_local = threading.local()


def get_current_request():
    """Return the current HTTP request, or None if outside a request context."""
    return getattr(_local, "request", None)


def get_current_user():
    """Return the current request's user, or None."""
    req = get_current_request()
    return getattr(req, "user", None) if req else None


class CurrentRequestMiddleware:
    """
    Stores the current request in thread-local storage for the duration
    of the request/response cycle. Always clears it in the finally block
    to prevent leaks between requests.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _local.request = request
        try:
            response = self.get_response(request)
        finally:
            _local.request = None  # Always clean up — never leak across requests
        return response