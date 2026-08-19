"""Branch/Department endpoints for standardizing academic branches across student profiles and placement drive eligibility.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_admin
from app.db.session import get_db
from app.models.branch import Branch
from app.models.user import User
from app.schemas.branch import BranchCreate, BranchResponse

router = APIRouter(tags=["branches"])


@router.get("/branches", response_model=list[BranchResponse])
def list_branches(
    db: Session = Depends(get_db),
) -> list[Branch]:
    """Returns all active academic branches for profile setup & drive selection."""
    return list(db.scalars(select(Branch).where(Branch.is_active.is_(True)).order_by(Branch.code)).all())


@router.post("/admin/branches", response_model=BranchResponse, status_code=status.HTTP_201_CREATED)
def create_branch(
    payload: BranchCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Branch:
    """Admin-only: Add a new academic branch."""
    existing = db.scalar(select(Branch).where(Branch.code == payload.code.upper()))
    if existing:
        if not existing.is_active:
            existing.is_active = True
            existing.name = payload.name
            db.commit()
            db.refresh(existing)
            return existing
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Branch code already exists")

    branch = Branch(code=payload.code.upper(), name=payload.name, is_active=True)
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch


@router.delete("/admin/branches/{branch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_branch(
    branch_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    """Admin-only: Soft-delete/deactivate an academic branch."""
    branch = db.get(Branch, branch_id)
    if branch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")

    branch.is_active = False
    db.commit()
    return None
