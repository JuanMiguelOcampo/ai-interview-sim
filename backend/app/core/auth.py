from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

# This tells FastAPI to look for the "Authorization: Bearer <token>" header
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Validates the JWT token sent from the Next.js frontend.
    Returns the Clerk User ID string.
    """
    token = credentials.credentials
    
    try:
        # 🚨 PROTOTYPE MODE: For local testing, we will read the unverified payload.
        # In strict production, you will fetch Clerk's JWKS public key to verify the signature.
        payload = jwt.decode(token, options={"verify_signature": False})
        
        # Clerk stores the unique user ID in the 'sub' (subject) claim
        clerk_id = payload.get("sub")
        
        if not clerk_id:
            raise ValueError("Token missing subject claim")
            
        return clerk_id
        
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )