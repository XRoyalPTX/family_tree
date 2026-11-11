"""Initial schema for Family Tree

Revision ID: 0001_initial
Revises: 
Create Date: 2026-11-11 19:24:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "trees",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_trees_id"), "trees", ["id"], unique=False)

    op.create_table(
        "persons",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tree_id", sa.Integer(), nullable=False),
        sa.Column("first_name", sa.String(length=120), nullable=False),
        sa.Column("last_name", sa.String(length=120), nullable=True),
        sa.Column("middle_name", sa.String(length=120), nullable=True),
        sa.Column("maiden_name", sa.String(length=120), nullable=True),
        sa.Column("gender", sa.String(length=20), nullable=False, server_default="unknown"),
        sa.Column("birth_date", sa.String(length=50), nullable=True),
        sa.Column("birth_year", sa.Integer(), nullable=True),
        sa.Column("is_birth_year_approx", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("death_date", sa.String(length=50), nullable=True),
        sa.Column("death_year", sa.Integer(), nullable=True),
        sa.Column("is_death_year_approx", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("is_alive", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("birth_place", sa.String(length=255), nullable=True),
        sa.Column("death_place", sa.String(length=255), nullable=True),
        sa.Column("burial_place", sa.String(length=255), nullable=True),
        sa.Column("residence_place", sa.String(length=255), nullable=True),
        sa.Column("occupation", sa.String(length=255), nullable=True),
        sa.Column("education", sa.String(length=255), nullable=True),
        sa.Column("social_class", sa.String(length=150), nullable=True),
        sa.Column("confession", sa.String(length=150), nullable=True),
        sa.Column("nationality", sa.String(length=120), nullable=True),
        sa.Column("archive_sources", sa.Text(), nullable=True),
        sa.Column("biography", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["tree_id"], ["trees.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_persons_id"), "persons", ["id"], unique=False)
    op.create_index(op.f("ix_persons_tree_id"), "persons", ["tree_id"], unique=False)

    op.create_table(
        "unions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tree_id", sa.Integer(), nullable=False),
        sa.Column("partner1_id", sa.Integer(), nullable=True),
        sa.Column("partner2_id", sa.Integer(), nullable=True),
        sa.Column("union_type", sa.String(length=40), nullable=False, server_default="married"),
        sa.Column("marriage_year", sa.Integer(), nullable=True),
        sa.Column("marriage_place", sa.String(length=255), nullable=True),
        sa.Column("divorce_year", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["tree_id"], ["trees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["partner1_id"], ["persons.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["partner2_id"], ["persons.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_unions_id"), "unions", ["id"], unique=False)
    op.create_index(op.f("ix_unions_tree_id"), "unions", ["tree_id"], unique=False)
    op.create_index(op.f("ix_unions_partner1_id"), "unions", ["partner1_id"], unique=False)
    op.create_index(op.f("ix_unions_partner2_id"), "unions", ["partner2_id"], unique=False)

    op.create_table(
        "child_relations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tree_id", sa.Integer(), nullable=False),
        sa.Column("union_id", sa.Integer(), nullable=False),
        sa.Column("child_id", sa.Integer(), nullable=False),
        sa.Column("relation_type", sa.String(length=40), nullable=False, server_default="biological"),
        sa.ForeignKeyConstraint(["tree_id"], ["trees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["union_id"], ["unions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["child_id"], ["persons.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_child_relations_id"), "child_relations", ["id"], unique=False)
    op.create_index(op.f("ix_child_relations_tree_id"), "child_relations", ["tree_id"], unique=False)
    op.create_index(op.f("ix_child_relations_union_id"), "child_relations", ["union_id"], unique=False)
    op.create_index(op.f("ix_child_relations_child_id"), "child_relations", ["child_id"], unique=False)


def downgrade() -> None:
    op.drop_table("child_relations")
    op.drop_table("unions")
    op.drop_table("persons")
    op.drop_table("trees")
