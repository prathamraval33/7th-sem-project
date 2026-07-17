"""Domain-specific exceptions raised by services. Routers (Phase 4) will
catch these and translate them into proper HTTP responses; a global
exception handler (Phase 9 hardening) will give them a consistent JSON shape.
Kept here (not in models/schemas) since they represent business-logic
failures, not data-shape problems.
"""


class AppError(Exception):
    """Base class for all domain errors. `code` is a short machine-readable
    identifier a router/exception-handler can map to an HTTP status.
    """

    def __init__(self, message: str, code: str = "app_error"):
        super().__init__(message)
        self.message = message
        self.code = code


class FileValidationError(AppError):
    def __init__(self, message: str):
        super().__init__(message, code="file_validation_error")


class OtpError(AppError):
    def __init__(self, message: str, code: str = "otp_error"):
        super().__init__(message, code=code)


class OtpExpiredError(OtpError):
    def __init__(self, message: str = "OTP has expired"):
        super().__init__(message, code="otp_expired")


class OtpInvalidError(OtpError):
    def __init__(self, message: str = "OTP is invalid"):
        super().__init__(message, code="otp_invalid")


class OtpRateLimitError(OtpError):
    def __init__(self, message: str = "Too many OTP requests, please try again later"):
        super().__init__(message, code="otp_rate_limited")


class RateLimitError(AppError):
    def __init__(self, message: str = "Rate limit exceeded, please try again later"):
        super().__init__(message, code="rate_limited")


class GroqServiceError(AppError):
    def __init__(self, message: str = "The AI service is temporarily unavailable"):
        super().__init__(message, code="groq_service_error")


class SearchProviderError(AppError):
    def __init__(self, message: str = "The web search service is temporarily unavailable"):
        super().__init__(message, code="search_provider_error")


class InstantTestConfigError(AppError):
    def __init__(self, message: str):
        super().__init__(message, code="instant_test_config_error")
