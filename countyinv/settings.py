
from pathlib import Path
import os
import dj_database_url
from dotenv import load_dotenv
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DEBUG = os.getenv("DEBUG", "1") == "1"
_default_demo_lock = "1" if DEBUG else "0"
DEMO_DATA_LOCKED = os.getenv("DEMO_DATA_LOCKED", _default_demo_lock) == "1"
# ------------------------------------------------------------------------------
# CORE SETTINGS
# ------------------------------------------------------------------------------
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("DJANGO_SECRET_KEY is not set in .env — refusing to start.")

ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "127.0.0.1,localhost").split(",")

DEV_KEY        = os.getenv("DEV_KEY", "")
DEV_ACCESS_CODE = os.getenv("DEV_ACCESS_CODE", "")

# ------------------------------------------------------------------------------
# APPLICATIONS
# ------------------------------------------------------------------------------
INSTALLED_APPS = [
    # Django core
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party
    "rest_framework",
    "django_filters",
    "corsheaders",

    # Local apps
    "common",
    "accounts",
    "core",
    "inventory",
]

# ------------------------------------------------------------------------------
# AUTH / USERS
# ------------------------------------------------------------------------------
AUTH_USER_MODEL = "accounts.User"

LOGIN_URL = "/api-auth/login/"
LOGOUT_REDIRECT_URL = "/api-auth/login/"

# ------------------------------------------------------------------------------
# MIDDLEWARE
# ------------------------------------------------------------------------------
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
"django.middleware.security.SecurityMiddleware",
"whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "common.middleware.CurrentRequestMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# ------------------------------------------------------------------------------
# URLS / WSGI
# ------------------------------------------------------------------------------
ROOT_URLCONF = "countyinv.urls"
WSGI_APPLICATION = "countyinv.wsgi.application"

# ------------------------------------------------------------------------------
# TEMPLATES
# ------------------------------------------------------------------------------
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ------------------------------------------------------------------------------
# DATABASE
# ------------------------------------------------------------------------------
DATABASES = {
    "default": dj_database_url.config(
        default=f"postgresql://{os.getenv('DB_USER','')}:{os.getenv('DB_PASSWORD','')}@{os.getenv('DB_HOST','localhost')}:{os.getenv('DB_PORT','5432')}/{os.getenv('DB_NAME','countyinv')}",
        conn_max_age=0 if DEBUG else 60,
    )
}

# ------------------------------------------------------------------------------
# PASSWORD VALIDATION
# ------------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ------------------------------------------------------------------------------
# INTERNATIONALIZATION
# ------------------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE     = "America/New_York"
USE_I18N      = True
USE_TZ        = True

# ------------------------------------------------------------------------------
# STATIC FILES
# ------------------------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ------------------------------------------------------------------------------
# DJANGO REST FRAMEWORK
# ------------------------------------------------------------------------------
REST_FRAMEWORK = {
    # No session/token auth — role driven by custom headers
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],

    # ── Pagination ──────────────────────────────────────────────────────────
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,

    # ── Throttling ───────────────────────────────────────────────────────────
    # Enabled in all environments so developers experience realistic limits.
    # Higher caps in DEBUG prevent test friction while still exercising the code path.
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "3000/hour" if DEBUG else "300/hour",
        "user": "10000/hour" if DEBUG else "2000/hour",
    },
}

# ------------------------------------------------------------------------------
# CORS  (django-cors-headers)
# ------------------------------------------------------------------------------
_cors_raw = os.getenv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:5173 http://127.0.0.1:5173 https://nveeravenkataganesh.github.io https://county-inventory-system.vercel.app"
)

CORS_ALLOWED_ORIGINS = _cors_raw.split()

CORS_ALLOW_CREDENTIALS = True  # allow cookies

CORS_ALLOW_HEADERS = [
    "accept",
    "content-type",
    "x-csrftoken",
    "x-requested-with",
    "x-acting-role",   # custom role header
    "x-dept-code",     # custom dept header
    "x-username",      # request attribution header
    "x-dev-key",       # dev panel key
]
# ------------------------------------------------------------------------------
# CSRF / SESSION
# ------------------------------------------------------------------------------
CSRF_TRUSTED_ORIGINS = os.getenv(
    "CSRF_TRUSTED_ORIGINS",
    "http://localhost:5173 http://127.0.0.1:5173"
).split()

CSRF_COOKIE_HTTPONLY  = True   # JS cannot steal CSRF token via XSS
CSRF_COOKIE_SAMESITE  = "Lax"
SESSION_COOKIE_SAMESITE = "Lax"

# ------------------------------------------------------------------------------
# SECURITY HEADERS  (only enforce in production)
# ------------------------------------------------------------------------------
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER        = True
    SECURE_CONTENT_TYPE_NOSNIFF       = True
    X_FRAME_OPTIONS                   = "DENY"
    SECURE_HSTS_SECONDS               = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS    = True
    SECURE_SSL_REDIRECT               = True
    SESSION_COOKIE_SECURE             = True
    CSRF_COOKIE_SECURE                = True

# ------------------------------------------------------------------------------
# DEVELOPER ACCESS
# ------------------------------------------------------------------------------
DEV_USERNAME    = os.getenv("DEV_USERNAME", "devadmin")
DEV_PASSWORD    = os.getenv("DEV_PASSWORD", "")   # required in .env

# ------------------------------------------------------------------------------
# LOGGING
# ------------------------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "dev": {
            "format": "[{levelname}] {asctime} {module}: {message}",
            "style": "{",
        },
        "prod": {
            # Structured single-line format — easy to ingest into log aggregators
            "format": "level={levelname} time={asctime} module={module} msg={message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "dev" if DEBUG else "prod",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "DEBUG" if DEBUG else "INFO",
    },
    "loggers": {
        "django.db.backends": {
            "level": "WARNING",   # suppress SQL query spam
            "handlers": ["console"],
            "propagate": False,
        },
        "inventory": {
            "level": "DEBUG" if DEBUG else "INFO",
            "handlers": ["console"],
            "propagate": False,
        },
        "accounts": {
            "level": "DEBUG" if DEBUG else "INFO",
            "handlers": ["console"],
            "propagate": False,
        },
    },
}