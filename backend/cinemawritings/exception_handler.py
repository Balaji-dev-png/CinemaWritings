"""
Custom DRF Exception Handler — never leaks internal details to clients.

Registered in settings.py:
    REST_FRAMEWORK = {
        'EXCEPTION_HANDLER': 'cinemawritings.exception_handler.custom_exception_handler',
    }
"""

import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)

# Map common HTTP status codes to safe, generic user messages
_STATUS_MESSAGES = {
    400: "Invalid request. Please check your input and try again.",
    401: "Authentication required. Please log in.",
    403: "You do not have permission to perform this action.",
    404: "The requested resource was not found.",
    405: "Method not allowed.",
    429: "Too many requests. Please slow down and try again later.",
    500: "An unexpected server error occurred. Please try again.",
    502: "Service temporarily unavailable.",
    503: "Service temporarily unavailable. Please try again later.",
}


def custom_exception_handler(exc, context):
    """
    Intercepts all DRF exceptions and returns safe, generic error responses.

    - Known DRF exceptions (4xx) get a sanitized message.
    - Unknown exceptions (5xx) are logged server-side and return a generic message.
    - Stack traces are NEVER sent to the client.
    """
    # Let DRF handle the exception first to get the response object
    response = exception_handler(exc, context)

    if response is None:
        # Unhandled exception — log it fully server-side, send generic 500 to client
        view = context.get("view", "unknown view")
        logger.exception(
            "Unhandled exception in %s: %s",
            view,
            str(exc),
            exc_info=exc,
        )
        return Response(
            {"error": _STATUS_MESSAGES[500]},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # For handled DRF exceptions, sanitize the message
    status_code = response.status_code
    safe_message = _STATUS_MESSAGES.get(status_code, "An error occurred.")

    # Log 5xx errors server-side
    if status_code >= 500:
        logger.error(
            "Server error %d in %s: %s",
            status_code,
            context.get("view", "unknown"),
            str(exc),
        )

    # Replace response data with safe message
    # Preserve validation errors for 400 (they're safe — field-level messages)
    if status_code == 400 and isinstance(response.data, dict):
        # Keep field-level validation errors (e.g., {"title": ["This field is required."]})
        # but remove any internal server details
        sanitized = {}
        for field, errors in response.data.items():
            if isinstance(errors, list):
                sanitized[field] = [str(e) for e in errors]
            else:
                sanitized[field] = str(errors)
        response.data = sanitized if sanitized else {"error": safe_message}
    else:
        response.data = {"error": safe_message}

    return response
