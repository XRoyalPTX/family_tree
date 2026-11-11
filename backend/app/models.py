from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Tree(Base):
    __tablename__ = "trees"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    persons: Mapped[List["Person"]] = relationship(
        "Person", back_populates="tree", cascade="all, delete-orphan", passive_deletes=True
    )
    unions: Mapped[List["Union"]] = relationship(
        "Union", back_populates="tree", cascade="all, delete-orphan", passive_deletes=True
    )
    child_relations: Mapped[List["ChildRelation"]] = relationship(
        "ChildRelation", back_populates="tree", cascade="all, delete-orphan", passive_deletes=True
    )


class Person(Base):
    __tablename__ = "persons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tree_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("trees.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Основные данные (для карточки в дереве)
    first_name: Mapped[str] = mapped_column(String(120), nullable=False)
    last_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    middle_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    maiden_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    gender: Mapped[str] = mapped_column(String(20), default="unknown", nullable=False)  # male, female, unknown

    # Даты и годы жизни
    birth_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    birth_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_birth_year_approx: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    death_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    death_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_death_year_approx: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    is_alive: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Подробная генеалогическая и биографическая информация
    birth_place: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    death_place: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    burial_place: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    residence_place: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    occupation: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    education: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    social_class: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    confession: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    nationality: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)

    archive_sources: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    biography: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    tree: Mapped["Tree"] = relationship("Tree", back_populates="persons")


class Union(Base):
    """Союз / брак / родительская пара для привязки супругов и общих детей."""

    __tablename__ = "unions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tree_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("trees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    partner1_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("persons.id", ondelete="SET NULL"), nullable=True, index=True
    )
    partner2_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("persons.id", ondelete="SET NULL"), nullable=True, index=True
    )
    union_type: Mapped[str] = mapped_column(
        String(40), default="married", nullable=False
    )  # married, civil, divorced, parents
    marriage_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    marriage_place: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    divorce_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    tree: Mapped["Tree"] = relationship("Tree", back_populates="unions")
    children: Mapped[List["ChildRelation"]] = relationship(
        "ChildRelation", back_populates="union", cascade="all, delete-orphan", passive_deletes=True
    )


class ChildRelation(Base):
    """Привязка ребенка к союзу родителей."""

    __tablename__ = "child_relations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tree_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("trees.id", ondelete="CASCADE"), nullable=False, index=True
    )
    union_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("unions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    child_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("persons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    relation_type: Mapped[str] = mapped_column(
        String(40), default="biological", nullable=False
    )  # biological, adopted, foster

    tree: Mapped["Tree"] = relationship("Tree", back_populates="child_relations")
    union: Mapped["Union"] = relationship("Union", back_populates="children")
