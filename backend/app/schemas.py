from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


# --- Person Schemas ---

class PersonBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=120)
    last_name: Optional[str] = Field(default=None, max_length=120)
    middle_name: Optional[str] = Field(default=None, max_length=120)
    maiden_name: Optional[str] = Field(default=None, max_length=120)
    gender: Literal["male", "female", "unknown"] = "unknown"

    birth_date: Optional[str] = Field(default=None, max_length=50)
    birth_year: Optional[int] = None
    is_birth_year_approx: bool = False

    death_date: Optional[str] = Field(default=None, max_length=50)
    death_year: Optional[int] = None
    is_death_year_approx: bool = False

    is_alive: bool = True

    birth_place: Optional[str] = Field(default=None, max_length=255)
    death_place: Optional[str] = Field(default=None, max_length=255)
    burial_place: Optional[str] = Field(default=None, max_length=255)
    residence_place: Optional[str] = Field(default=None, max_length=255)

    occupation: Optional[str] = Field(default=None, max_length=255)
    education: Optional[str] = Field(default=None, max_length=255)
    social_class: Optional[str] = Field(default=None, max_length=150)
    confession: Optional[str] = Field(default=None, max_length=150)
    nationality: Optional[str] = Field(default=None, max_length=120)

    archive_sources: Optional[str] = None
    biography: Optional[str] = None


class PersonCreate(PersonBase):
    pass


class PersonUpdate(BaseModel):
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    last_name: Optional[str] = Field(default=None, max_length=120)
    middle_name: Optional[str] = Field(default=None, max_length=120)
    maiden_name: Optional[str] = Field(default=None, max_length=120)
    gender: Optional[Literal["male", "female", "unknown"]] = None

    birth_date: Optional[str] = Field(default=None, max_length=50)
    birth_year: Optional[int] = None
    is_birth_year_approx: Optional[bool] = None

    death_date: Optional[str] = Field(default=None, max_length=50)
    death_year: Optional[int] = None
    is_death_year_approx: Optional[bool] = None

    is_alive: Optional[bool] = None

    birth_place: Optional[str] = Field(default=None, max_length=255)
    death_place: Optional[str] = Field(default=None, max_length=255)
    burial_place: Optional[str] = Field(default=None, max_length=255)
    residence_place: Optional[str] = Field(default=None, max_length=255)

    occupation: Optional[str] = Field(default=None, max_length=255)
    education: Optional[str] = Field(default=None, max_length=255)
    social_class: Optional[str] = Field(default=None, max_length=150)
    confession: Optional[str] = Field(default=None, max_length=150)
    nationality: Optional[str] = Field(default=None, max_length=120)

    archive_sources: Optional[str] = None
    biography: Optional[str] = None


class PersonOut(PersonBase):
    id: int
    tree_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Union & ChildRelation Schemas ---

class ChildRelationBase(BaseModel):
    union_id: int
    child_id: int
    relation_type: Literal["biological", "adopted", "foster"] = "biological"


class ChildRelationCreate(BaseModel):
    child_id: int
    relation_type: Literal["biological", "adopted", "foster"] = "biological"


class ChildRelationOut(ChildRelationBase):
    id: int
    tree_id: int

    model_config = ConfigDict(from_attributes=True)


class UnionBase(BaseModel):
    partner1_id: Optional[int] = None
    partner2_id: Optional[int] = None
    union_type: Literal["married", "civil", "divorced", "parents"] = "married"
    marriage_year: Optional[int] = None
    marriage_place: Optional[str] = Field(default=None, max_length=255)
    divorce_year: Optional[int] = None
    notes: Optional[str] = None


class UnionCreate(UnionBase):
    tree_id: int


class UnionUpdate(BaseModel):
    partner1_id: Optional[int] = None
    partner2_id: Optional[int] = None
    union_type: Optional[Literal["married", "civil", "divorced", "parents"]] = None
    marriage_year: Optional[int] = None
    marriage_place: Optional[str] = Field(default=None, max_length=255)
    divorce_year: Optional[int] = None
    notes: Optional[str] = None


class UnionOut(UnionBase):
    id: int
    tree_id: int
    children: List[ChildRelationOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


# --- Contextual Relative Creation / Linking ---

class AddRelativeRequest(BaseModel):
    relation: Literal["parent", "spouse", "child", "sibling"]
    # Either provide new_person data OR existing_person_id
    new_person: Optional[PersonCreate] = None
    existing_person_id: Optional[int] = None
    # Extra options for spouse / child / parent links
    union_id: Optional[int] = None
    union_type: Literal["married", "civil", "divorced", "parents"] = "married"
    marriage_year: Optional[int] = None
    marriage_place: Optional[str] = None
    relation_type: Literal["biological", "adopted", "foster"] = "biological"
    merge_single_union: bool = True


# --- Tree Schemas ---

class TreeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None


class TreeCreate(TreeBase):
    pass


class TreeUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None


class TreeSummary(TreeBase):
    id: int
    person_count: int = 0
    union_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TreeFull(TreeBase):
    id: int
    created_at: datetime
    updated_at: datetime
    persons: List[PersonOut] = Field(default_factory=list)
    unions: List[UnionOut] = Field(default_factory=list)
    child_relations: List[ChildRelationOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


# --- Import / Export Schemas ---

class ExportPersonItem(PersonBase):
    ref_id: int


class ExportUnionItem(BaseModel):
    ref_id: int
    partner1_ref: Optional[int] = None
    partner2_ref: Optional[int] = None
    union_type: Literal["married", "civil", "divorced", "parents"] = "married"
    marriage_year: Optional[int] = None
    marriage_place: Optional[str] = None
    divorce_year: Optional[int] = None
    notes: Optional[str] = None


class ExportChildItem(BaseModel):
    union_ref: int
    child_ref: int
    relation_type: Literal["biological", "adopted", "foster"] = "biological"


class TreeExportPayload(BaseModel):
    version: str = "1.0"
    name: str
    description: Optional[str] = None
    persons: List[ExportPersonItem] = Field(default_factory=list)
    unions: List[ExportUnionItem] = Field(default_factory=list)
    child_relations: List[ExportChildItem] = Field(default_factory=list)
