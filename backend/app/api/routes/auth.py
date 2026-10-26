
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import uuid

from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import UserCreate, UserResponse, Token, LoginRequest
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
)
from app.core.deps import get_current_user
from app.services.audit_service import log_action

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(
        User.email == data.email.lower()
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        id=uuid.uuid4(),
        email=data.email.lower(),
        name=data.name,
        hashed_password=get_password_hash(data.password),
        role=data.role or "agent",
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": str(user.id)})
    log_action(db, str(user.id), "user_registered", "user", str(user.id))

    return {"access_token": token, "token_type": "bearer"}


# Existing JSON login endpoint — keep this for the frontend.
@router.post("/login", response_model=Token)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.email == data.email.lower()
    ).first()

    if not user or not verify_password(
        data.password, user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    token = create_access_token(data={"sub": str(user.id)})
    log_action(db, str(user.id), "user_login", "user", str(user.id))

    return {"access_token": token, "token_type": "bearer"}


# OAuth2 form login endpoint — used by Swagger's Authorize button.
@router.post("/token", response_model=Token)
def swagger_login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(
        User.email == form_data.username.lower()
    ).first()

    if not user or not verify_password(
        form_data.password, user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    token = create_access_token(data={"sub": str(user.id)})
    log_action(db, str(user.id), "user_login", "user", str(user.id))

    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
