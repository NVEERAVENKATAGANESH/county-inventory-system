from django.conf import settings
from django.contrib.auth import get_user_model

UNLOCK_HEADER = "X-Demo-Unlock"
DEV_KEY_HEADER = "X-Dev-Key"


def is_demo_data_locked() -> bool:
    return bool(getattr(settings, "DEMO_DATA_LOCKED", False))


def _is_valid_dev_key(request) -> bool:
    dev_key = (request.headers.get(DEV_KEY_HEADER) or "").strip()
    if not dev_key:
        return False

    User = get_user_model()
    return User.objects.filter(username=dev_key, role="DEVELOPER", is_active=True).exists()


def is_demo_unlocked(request) -> bool:
    """
    When DEMO_DATA_LOCKED=False -> always unlocked.
    When DEMO_DATA_LOCKED=True  -> unlocked if:
      - valid developer session (X-Dev-Key matches active DEVELOPER user), OR
      - X-Demo-Unlock: 1 (portal UI after DevPanel Apply)
    """
    if not is_demo_data_locked():
        return True

    # DevPanel traffic is always allowed (so seeding/diagnostics can work)
    if _is_valid_dev_key(request):
        return True

    return (request.headers.get(UNLOCK_HEADER) or "").strip() == "1"