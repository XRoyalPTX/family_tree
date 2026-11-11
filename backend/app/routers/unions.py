from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db

router = APIRouter(prefix="/api/unions", tags=["unions"])


@router.post("", response_model=schemas.UnionOut, status_code=status.HTTP_201_CREATED)
def create_union(payload: schemas.UnionCreate, db: Session = Depends(get_db)):
    return crud.create_union(db, payload)


@router.get("/{union_id}", response_model=schemas.UnionOut)
def get_union(union_id: int, db: Session = Depends(get_db)):
    return crud.get_union_or_404(db, union_id)


@router.put("/{union_id}", response_model=schemas.UnionOut)
def update_union(
    union_id: int, payload: schemas.UnionUpdate, db: Session = Depends(get_db)
):
    return crud.update_union(db, union_id, payload)


@router.delete("/{union_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_union(union_id: int, db: Session = Depends(get_db)):
    crud.delete_union(db, union_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{union_id}/children",
    response_model=schemas.ChildRelationOut,
    status_code=status.HTTP_201_CREATED,
)
def add_child(
    union_id: int, payload: schemas.ChildRelationCreate, db: Session = Depends(get_db)
):
    return crud.add_child_to_union(db, union_id, payload)


@router.delete("/{union_id}/children/{child_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_child(union_id: int, child_id: int, db: Session = Depends(get_db)):
    crud.remove_child_from_union(db, union_id, child_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
