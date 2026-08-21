"""Resource library (aptitude/communication/os/dbms/cn/interview_qna/java/
python x video/blog/document) — student read access, admin CRUD.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_admin
from app.db.session import get_db
from app.models.resource import Resource, ResourceCategory, ResourceContentType
from app.models.user import User
from app.schemas.resource import ResourceCreate, ResourceResponse, ResourceUpdate

router = APIRouter(prefix="/resources", tags=["resources"])


@router.get("", response_model=list[ResourceResponse])
def list_resources(
    category: Optional[ResourceCategory] = None,
    content_type: Optional[ResourceContentType] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Resource]:
    query = select(Resource)
    if current_user.college_id is not None and current_user.user_type.value != "superadmin":
        query = query.where(or_(Resource.college_id.is_(None), Resource.college_id == current_user.college_id))
    if category is not None:
        query = query.where(Resource.category == category)
    if content_type is not None:
        query = query.where(Resource.content_type == content_type)

    return list(db.scalars(query.order_by(Resource.id.desc())).all())


@router.get("/{resource_id}", response_model=ResourceResponse)
def get_resource(
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Resource:
    resource = db.get(Resource, resource_id)
    if resource is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Resource not found")
    if (
        current_user.college_id is not None
        and current_user.user_type.value != "superadmin"
        and resource.college_id is not None
        and resource.college_id != current_user.college_id
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You do not have access to this resource")
    return resource


@router.post("", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
def create_resource(
    payload: ResourceCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Resource:
    resource = Resource(**payload.model_dump(), college_id=current_user.college_id, created_by=current_user.id)
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource


@router.patch("/{resource_id}", response_model=ResourceResponse)
def update_resource(
    resource_id: int,
    payload: ResourceUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Resource:
    resource = db.get(Resource, resource_id)
    if resource is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Resource not found")
    if (
        current_user.college_id is not None
        and resource.college_id is not None
        and resource.college_id != current_user.college_id
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You do not have permission to manage this resource")

    for field_name, value in payload.model_dump(exclude_unset=True).items():
        setattr(resource, field_name, value)
    db.commit()
    db.refresh(resource)
    return resource


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(
    resource_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    resource = db.get(Resource, resource_id)
    if resource is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Resource not found")
    if (
        current_user.college_id is not None
        and resource.college_id is not None
        and resource.college_id != current_user.college_id
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You do not have permission to manage this resource")
    db.delete(resource)
    db.commit()
