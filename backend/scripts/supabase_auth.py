"""
Supabase JWT Authentication for Django REST Framework.

Replaces rest_framework_simplejwt with direct Supabase JWT verification.
Supabase issues JWTs signed with a project-specific secret (HS256) or
RS256 via JWKS. We use the JWKS endpoint for production-grade verification.

Setup in settings.py:
    REST_FRAMEWORK = {
        'DEFAULT_AUTHENTICATION_CLASSES': [
            'scripts.supabase_auth.SupabaseAuthentication',
        ],
        ...
    }

Required env var:
    SUPABASE_JWT_SECRET — found in Supabase Dashboard → Settings → API → JWT Secret
"""

import os
import logging
import jwt
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

logger = logging.getLogger(__name__)


class SupabaseUser:
    """
    Lightweight user object that holds the Supabase user ID.
    Compatible with Django REST Framework's permission system.
    Avoids any Django DB lookup — auth is entirely stateless via JWT.
    """

    def __init__(self, user_id: str, email: str = ""):
        self.id = user_id
        self.pk = user_id  # DRF uses .pk for permission checks
        self.email = email
        self.is_authenticated = True  # Required by DRF permissions
        self.is_active = True
        self.is_anonymous = False
        self.is_staff = False

    def __str__(self):
        return f"SupabaseUser({self.id})"


class SupabaseAuthentication(BaseAuthentication):
    """
    Verifies Supabase JWT tokens sent in the Authorization header.

    Token format: Authorization: Bearer <supabase-jwt>

    The JWT is verified against SUPABASE_JWT_SECRET (HS256).
    If the secret is not set, authentication is refused in production
    and a warning is logged.
    """

    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return None  # Not our auth scheme — let other authenticators try

        token = auth_header.split(" ", 1)[1].strip()
        if not token or token == "null" or token == "undefined":
            return None

        jwt_secret = os.environ.get("SUPABASE_JWT_SECRET", "")

        if not jwt_secret:
            logger.error(
                "SUPABASE_JWT_SECRET is not set. "
                "Cannot verify Supabase JWTs. Set this env var immediately."
            )
            return None

        try:
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                options={
                    "verify_exp": True,
                    "verify_aud": False,  # Supabase audience can vary
                },
            )
        except jwt.ExpiredSignatureError:
            logger.info("Supabase JWT expired.")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning("Invalid Supabase JWT: %s", str(e))
            return None
        except Exception as e:
            logger.error("Unexpected JWT verification error: %s", str(e))
            return None

        user_id = payload.get("sub")
        if not user_id:
            return None

        email = payload.get("email", "")
        user = SupabaseUser(user_id=user_id, email=email)
        return (user, token)

    def authenticate_header(self, request):
        return "Bearer"
