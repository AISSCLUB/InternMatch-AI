"""
Supabase Bearer JWT Authentication Foundation & Reusable FastAPI Dependencies
Enforces cryptographic verification and strict claim validation for Supabase JWTs.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import UUID

import jwt
from app.core.config import settings
from app.core.logging import get_logger
from fastapi import Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, Field

logger = get_logger(__name__)

# Explicitly restricted algorithm list for symmetric Supabase HS256 secret verification
ALLOWED_ALGORITHMS = ["HS256"]


class AuthenticatedUser(BaseModel):
    """Container for validated Supabase authenticated user identity."""

    user_id: UUID = Field(..., description="Supabase auth user UUID extracted from JWT sub claim")
    email: Optional[str] = Field(None, description="Optional user email from JWT claims")
    role: Optional[str] = Field(None, description="Optional auth role (e.g. authenticated)")
    token_claims: Dict[str, Any] = Field(
        default_factory=dict, description="Complete verified JWT payload claims"
    )


def format_auth_error(message: str, code: str = "UNAUTHORIZED") -> Dict[str, Any]:
    """Helper to generate standardized machine-readable authentication error payloads."""
    return {
        "error": {
            "code": code,
            "message": message,
            "details": None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    }


def verify_jwt_token(token: str) -> Dict[str, Any]:
    """
    Validate Supabase JWT bearer token algorithm, signature, expiration, issuer,
    audience, and subject. Never logs or exposes the raw token string or secrets.
    """
    try:
        # Step 1: Restrict algorithm strictly to prevent algorithm confusion attacks
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg")
        if not alg or alg not in ALLOWED_ALGORITHMS:
            err_msg = (
                f"Unsupported JWT algorithm '{alg}'. "
                "Only HS256 is supported by the configured signing key strategy."
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=format_auth_error(err_msg),
            )

        secret = settings.SUPABASE_JWT_SECRET.strip()
        expected_issuer = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1"

        if (
            not secret
            or secret == "placeholder_jwt_secret_for_local_development"
            or not settings.SUPABASE_URL
            or "placeholder" in settings.SUPABASE_URL
        ):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=format_auth_error("Authentication service is not configured."),
            )

        options = {
            "verify_signature": True,
            "verify_exp": True,
            "verify_aud": True,
            "verify_iss": True,
        }

        # Step 2: Decode and verify signature and standard claims
        payload = jwt.decode(
            token,
            key=secret,
            algorithms=ALLOWED_ALGORITHMS,
            audience="authenticated",
            issuer=expected_issuer,
            options=options,
        )

        # Step 3: Explicit claim checks (Audience & Subject)
        aud = payload.get("aud")
        if aud != "authenticated":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=format_auth_error(
                    f"Invalid JWT audience '{aud}'. Expected 'authenticated'."
                ),
            )

        sub = payload.get("sub")
        if not sub:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=format_auth_error("Token is missing required subject ('sub') claim."),
            )

        try:
            UUID(str(sub))
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=format_auth_error("Token subject claim is not a valid UUID."),
            )

        return payload

    except HTTPException:
        raise
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=format_auth_error("Authentication token has expired."),
        )
    except jwt.InvalidAudienceError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=format_auth_error("Invalid JWT audience."),
        )
    except jwt.InvalidIssuerError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=format_auth_error("Invalid JWT issuer."),
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=format_auth_error("Invalid or malformed authentication token signature."),
        )


async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> AuthenticatedUser:
    """
    Reusable FastAPI authentication dependency.
    Extracts, validates, and derives user_id strictly from Bearer JWT in Authorization header.
    Never accepts client-supplied user_id from path, query, or request body.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=format_auth_error("Missing Authorization header."),
        )

    parts = authorization.strip().split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1]:
        err_fmt = "Invalid Authorization header format. Expected 'Bearer <JWT>'."
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=format_auth_error(err_fmt),
        )

    token = parts[1]
    payload = verify_jwt_token(token)

    sub = payload.get("sub")
    user_uuid = UUID(str(sub))

    return AuthenticatedUser(
        user_id=user_uuid,
        email=payload.get("email"),
        role=payload.get("role"),
        token_claims=payload,
    )


async def get_current_user_id(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> UUID:
    """Convenience dependency for endpoints that only require the authenticated user_id UUID."""
    return current_user.user_id
