from typing import List
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db

router = APIRouter(prefix="/api/trees", tags=["trees"])


@router.get("", response_model=List[schemas.TreeSummary])
def list_trees(db: Session = Depends(get_db)):
    return crud.list_trees(db)


@router.post("", response_model=schemas.TreeSummary, status_code=status.HTTP_201_CREATED)
def create_tree(payload: schemas.TreeCreate, db: Session = Depends(get_db)):
    tree = crud.create_tree(db, payload)
    return schemas.TreeSummary(
        id=tree.id,
        name=tree.name,
        description=tree.description,
        person_count=0,
        union_count=0,
        created_at=tree.created_at,
        updated_at=tree.updated_at,
    )


@router.post("/demo", response_model=schemas.TreeFull, status_code=status.HTTP_201_CREATED)
def create_demo_tree(db: Session = Depends(get_db)):
    return crud.create_demo_tree(db)


@router.post("/import", response_model=schemas.TreeFull, status_code=status.HTTP_201_CREATED)
def import_tree(payload: schemas.TreeExportPayload, db: Session = Depends(get_db)):
    return crud.import_tree(db, payload)


@router.get("/{tree_id}", response_model=schemas.TreeFull)
def get_tree(tree_id: int, db: Session = Depends(get_db)):
    return crud.get_tree_or_404(db, tree_id)


@router.put("/{tree_id}", response_model=schemas.TreeSummary)
def update_tree(tree_id: int, payload: schemas.TreeUpdate, db: Session = Depends(get_db)):
    tree = crud.update_tree(db, tree_id, payload)
    summaries = [t for t in crud.list_trees(db) if t.id == tree.id]
    return summaries[0]


@router.delete("/{tree_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tree(tree_id: int, db: Session = Depends(get_db)):
    crud.delete_tree(db, tree_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{tree_id}/export", response_model=schemas.TreeExportPayload)
def export_tree(tree_id: int, db: Session = Depends(get_db)):
    return crud.export_tree(db, tree_id)


@router.post("/{tree_id}/persons", response_model=schemas.PersonOut, status_code=status.HTTP_201_CREATED)
def create_person_in_tree(
    tree_id: int, payload: schemas.PersonCreate, db: Session = Depends(get_db)
):
    return crud.create_person(db, tree_id, payload)
