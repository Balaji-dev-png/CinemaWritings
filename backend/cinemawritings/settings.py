"""
Django settings for CinemaWritings project.

Security hardening applied:
- DEBUG defaults to False (must explicitly set to True in dev)
- Supabase JWT authentication replaces simple-jwt
- All security middleware settings enabled
- BrowsableAPIRenderer disabled in production
- Custom exception handler prevents info leakage
- CORS restricted to known origins only
"""
import os
from pathlib import Path
from dotenv import load_dotenv
import dj_database_url

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# ─── Core Security Settings ───────────────────────────────────────────────

# SECURITY: Never default to True — always read from env
# In production, this must be False or unset (defaults to False here)
SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    # Insecure default — only acceptable if DEBUG=True locally
    "django-insecure-change-me-in-production-xyz123"
)

# Default to False — must explicitly opt in to debug mode
DEBUG = os.getenv("DJANGO_DEBUG", "False").lower() in ("true", "1", "yes")
DJANGO_DEBUG=True
ALLOWED_HOSTS = os.getenv(
    "DJANGO_ALLOWED_HOSTS",
    "localhost,127.0.0.1"
).split(",")

# ─── Application definition ───────────────────────────────────────────────
INSTALLED_APPS = [
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "corsheaders",
    "reversion",
    "channels",
    # Local apps
    "scripts",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "reversion.middleware.RevisionMiddleware",
]

ROOT_URLCONF = "cinemawritings.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "export" / "templates"],
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

WSGI_APPLICATION = "cinemawritings.wsgi.application"
ASGI_APPLICATION = "cinemawritings.asgi.application"

# ─── Database — PostgreSQL ─────────────────────────────────────────────────
if os.getenv("DATABASE_URL"):
    DATABASES = {
        "default": dj_database_url.config(
            default=os.getenv("DATABASE_URL"),
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("DB_NAME", "cinemawritings"),
            "USER": os.getenv("DB_USER", "postgres"),
            "PASSWORD": os.getenv("DB_PASSWORD", ""),
            "HOST": os.getenv("DB_HOST", "localhost"),
            "PORT": os.getenv("DB_PORT", "5432"),
        }
    }

# ─── Django Channels — Redis ──────────────────────────────────────────────
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")],
        },
    },
}

# ─── REST Framework ────────────────────────────────────────────────────────
_renderers = ["rest_framework.renderers.JSONRenderer"]
# Only enable the browsable API in local development
if DEBUG:
    _renderers.append("rest_framework.renderers.BrowsableAPIRenderer")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "scripts.supabase_auth.SupabaseAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    "DEFAULT_RENDERER_CLASSES": _renderers,
    # Custom exception handler — never leaks stack traces
    "EXCEPTION_HANDLER": "cinemawritings.exception_handler.custom_exception_handler",
}

# ─── CORS ──────────────────────────────────────────────────────────────────
# Explicit opt-out from allow-all — must always be False
CORS_ALLOW_ALL_ORIGINS = False

CORS_ALLOWED_ORIGINS = os.getenv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000"
).split(",")

CORS_ALLOW_CREDENTIALS = True

# ─── Security Middleware Settings ─────────────────────────────────────────
# These are automatically managed by Django's SecurityMiddleware
# and should be enabled in production.

# XSS filter header (legacy but harmless)
SECURE_BROWSER_XSS_FILTER = True

# Prevent MIME sniffing
SECURE_CONTENT_TYPE_NOSNIFF = True

# Block clickjacking
X_FRAME_OPTIONS = "DENY"

# HSTS — enforce HTTPS for 1 year
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Redirect HTTP → HTTPS (only in production)
SECURE_SSL_REDIRECT = not DEBUG

# Secure cookies (only over HTTPS — disable in local dev)
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_HTTPONLY = True

# ─── Password validation ──────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ─── Internationalization ─────────────────────────────────────────────────
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ─── Static files ─────────────────────────────────────────────────────────
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# ─── Default primary key field type ───────────────────────────────────────
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ─── WeasyPrint font directory ────────────────────────────────────────────
WEASYPRINT_FONT_DIR = BASE_DIR / "export" / "fonts"

# ─── File Upload Limits ───────────────────────────────────────────────────
# Increase max memory size to 100MB to allow large base64 images in HTML payloads
DATA_UPLOAD_MAX_MEMORY_SIZE = 104857600
