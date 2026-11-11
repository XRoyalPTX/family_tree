from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db

router = APIRouter(prefix="/api/persons", tags=["persons"])


@router.get("/{person_id}", response_model=schemas.PersonOut)
def get_person(person_id: int, db: Session = Depends(get_db)):
    return crud.get_person_or_404(db, person_id)


@router.put("/{person_id}", response_model=schemas.PersonOut)
def update_person(
    person_id: int, payload: schemas.PersonUpdate, db: Session = Depends(get_db)
):
    return crud.update_person(db, person_id, payload)


@router.delete("/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_person(person_id: int, db: Session = Depends(get_db)):
    crud.delete_person(db, person_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{person_id}/relatives",
    response_model=schemas.PersonOut,
    status_code=status.HTTP_201_CREATED,
)
def add_relative(
    person_id: int, payload: schemas.AddRelativeRequest, db: Session = Depends(get_db)
):
    return crud.add_relative_to_person(db, person_id, payload)
