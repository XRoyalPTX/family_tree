from typing import List
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app import models, schemas


# --- Tree Operations ---

def list_trees(db: Session) -> List[schemas.TreeSummary]:
    trees = db.scalars(select(models.Tree).order_by(models.Tree.created_at.desc())).all()
    result: List[schemas.TreeSummary] = []
    for t in trees:
        p_count = db.scalar(select(func.count(models.Person.id)).where(models.Person.tree_id == t.id)) or 0
        u_count = db.scalar(select(func.count(models.Union.id)).where(models.Union.tree_id == t.id)) or 0
        result.append(
            schemas.TreeSummary(
                id=t.id,
                name=t.name,
                description=t.description,
                person_count=p_count,
                union_count=u_count,
                created_at=t.created_at,
                updated_at=t.updated_at,
            )
        )
    return result


def get_tree_or_404(db: Session, tree_id: int) -> models.Tree:
    stmt = (
        select(models.Tree)
        .where(models.Tree.id == tree_id)
        .options(
            selectinload(models.Tree.persons),
            selectinload(models.Tree.unions).selectinload(models.Union.children),
            selectinload(models.Tree.child_relations),
        )
    )
    tree = db.scalar(stmt)
    if not tree:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Дерево не найдено")
    return tree


def create_tree(db: Session, payload: schemas.TreeCreate) -> models.Tree:
    tree = models.Tree(name=payload.name.strip(), description=payload.description)
    db.add(tree)
    db.commit()
    db.refresh(tree)
    return tree


def update_tree(db: Session, tree_id: int, payload: schemas.TreeUpdate) -> models.Tree:
    tree = db.get(models.Tree, tree_id)
    if not tree:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Дерево не найдено")
    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(tree, k, v)
    db.commit()
    db.refresh(tree)
    return tree


def delete_tree(db: Session, tree_id: int) -> None:
    tree = db.get(models.Tree, tree_id)
    if not tree:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Дерево не найдено")
    db.delete(tree)
    db.commit()


# --- Person Operations ---

def get_person_or_404(db: Session, person_id: int) -> models.Person:
    person = db.get(models.Person, person_id)
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персона не найдена")
    return person


def create_person(db: Session, tree_id: int, payload: schemas.PersonCreate) -> models.Person:
    tree = db.get(models.Tree, tree_id)
    if not tree:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Дерево не найдено")

    data = payload.model_dump()
    if data.get("death_year") or data.get("death_date"):
        data["is_alive"] = False

    person = models.Person(tree_id=tree_id, **data)
    db.add(person)
    db.commit()
    db.refresh(person)
    return person


def update_person(db: Session, person_id: int, payload: schemas.PersonUpdate) -> models.Person:
    person = get_person_or_404(db, person_id)
    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(person, k, v)
    db.commit()
    db.refresh(person)
    return person


def delete_person(db: Session, person_id: int) -> None:
    person = get_person_or_404(db, person_id)

    # Clean up unions where this person is partner1 or partner2
    unions = db.scalars(
        select(models.Union).where(
            (models.Union.partner1_id == person_id) | (models.Union.partner2_id == person_id)
        )
    ).all()

    for u in unions:
        if u.partner1_id == person_id:
            u.partner1_id = u.partner2_id
            u.partner2_id = None
        elif u.partner2_id == person_id:
            u.partner2_id = None

        if u.partner1_id is None and u.partner2_id is None:
            db.delete(u)

    # Delete child_relations where this person is a child
    child_rels = db.scalars(
        select(models.ChildRelation).where(models.ChildRelation.child_id == person_id)
    ).all()
    for cr in child_rels:
        db.delete(cr)

    db.delete(person)
    db.commit()


# --- Union & ChildRelation Operations ---

def get_union_or_404(db: Session, union_id: int) -> models.Union:
    stmt = (
        select(models.Union)
        .where(models.Union.id == union_id)
        .options(selectinload(models.Union.children))
    )
    union = db.scalar(stmt)
    if not union:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Союз не найден")
    return union


def create_union(db: Session, payload: schemas.UnionCreate) -> models.Union:
    tree = db.get(models.Tree, payload.tree_id)
    if not tree:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Дерево не найдено")

    if payload.partner1_id is None and payload.partner2_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Необходимо указать хотя бы одного партнера для союза",
        )
    if payload.partner1_id and payload.partner2_id and payload.partner1_id == payload.partner2_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя создать союз человека с самим собой",
        )

    for pid in (payload.partner1_id, payload.partner2_id):
        if pid is not None:
            p = get_person_or_404(db, pid)
            if p.tree_id != payload.tree_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Персона принадлежит другому дереву",
                )

    p1 = payload.partner1_id or payload.partner2_id
    p2 = payload.partner2_id if payload.partner1_id else None

    union = models.Union(
        tree_id=payload.tree_id,
        partner1_id=p1,
        partner2_id=p2,
        union_type=payload.union_type,
        marriage_year=payload.marriage_year,
        marriage_place=payload.marriage_place,
        divorce_year=payload.divorce_year,
        notes=payload.notes,
    )
    db.add(union)
    db.commit()
    return get_union_or_404(db, union.id)


def update_union(db: Session, union_id: int, payload: schemas.UnionUpdate) -> models.Union:
    union = get_union_or_404(db, union_id)
    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(union, k, v)
    if union.partner1_id is None and union.partner2_id is not None:
        union.partner1_id = union.partner2_id
        union.partner2_id = None
    db.commit()
    return get_union_or_404(db, union.id)


def delete_union(db: Session, union_id: int) -> None:
    union = get_union_or_404(db, union_id)
    db.delete(union)
    db.commit()


def add_child_to_union(
    db: Session, union_id: int, payload: schemas.ChildRelationCreate
) -> models.ChildRelation:
    union = get_union_or_404(db, union_id)
    child = get_person_or_404(db, payload.child_id)
    if child.tree_id != union.tree_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ребенок принадлежит другому дереву",
        )
    if payload.child_id in (union.partner1_id, union.partner2_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Человек не может быть собственным ребенком",
        )

    existing = db.scalar(
        select(models.ChildRelation).where(
            models.ChildRelation.union_id == union_id,
            models.ChildRelation.child_id == payload.child_id,
        )
    )
    if existing:
        return existing

    rel = models.ChildRelation(
        tree_id=union.tree_id,
        union_id=union_id,
        child_id=payload.child_id,
        relation_type=payload.relation_type,
    )
    db.add(rel)
    db.commit()
    db.refresh(rel)
    return rel


def remove_child_from_union(db: Session, union_id: int, child_id: int) -> None:
    rel = db.scalar(
        select(models.ChildRelation).where(
            models.ChildRelation.union_id == union_id,
            models.ChildRelation.child_id == child_id,
        )
    )
    if not rel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Связь ребенка не найдена")
    db.delete(rel)
    db.commit()


# --- Contextual Relative Helper ---

def add_relative_to_person(
    db: Session, target_person_id: int, req: schemas.AddRelativeRequest
) -> models.Person:
    target = get_person_or_404(db, target_person_id)
    tree_id = target.tree_id

    # Pre-validate relationship constraints before creating any new person record
    parent_rels = db.scalars(
        select(models.ChildRelation).where(models.ChildRelation.child_id == target.id)
    ).all()

    if req.relation == "parent" and parent_rels:
        parent_union = db.get(models.Union, parent_rels[0].union_id)
        if (
            parent_union
            and parent_union.partner1_id is not None
            and parent_union.partner2_id is not None
        ):
            if req.existing_person_id not in (parent_union.partner1_id, parent_union.partner2_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="У выбранного человека уже указаны оба родителя",
                )

    if req.relation == "sibling" and not parent_rels:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Чтобы добавить брата или сестру, сначала укажите хотя бы одного родителя",
        )

    if req.relation == "child" and req.union_id is not None:
        u_check = get_union_or_404(db, req.union_id)
        if u_check.tree_id != tree_id:
            raise HTTPException(status_code=400, detail="Союз принадлежит другому дереву")

    if req.existing_person_id is not None:
        if req.existing_person_id == target.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Нельзя связать человека с самим собой",
            )
        relative = get_person_or_404(db, req.existing_person_id)
        if relative.tree_id != tree_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Выбранная персона находится в другом дереве",
            )
    elif req.new_person is not None:
        data = req.new_person.model_dump()
        if data.get("death_year") or data.get("death_date"):
            data["is_alive"] = False
        relative = models.Person(tree_id=tree_id, **data)
        db.add(relative)
        db.flush()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Укажите данные новой персоны или ID существующей",
        )

    if req.relation == "spouse":
        # Check if union between target and relative already exists
        existing_union = db.scalar(
            select(models.Union).where(
                models.Union.tree_id == tree_id,
                (
                    ((models.Union.partner1_id == target.id) & (models.Union.partner2_id == relative.id))
                    | ((models.Union.partner1_id == relative.id) & (models.Union.partner2_id == target.id))
                ),
            )
        )
        if not existing_union:
            # Check if target has a single-parent union we should merge into
            single_union = None
            if req.merge_single_union:
                single_unions = db.scalars(
                    select(models.Union).where(
                        models.Union.tree_id == tree_id,
                        models.Union.partner1_id == target.id,
                        models.Union.partner2_id.is_(None),
                    )
                ).all()
                if len(single_unions) == 1:
                    single_union = single_unions[0]

            if single_union:
                single_union.partner2_id = relative.id
                single_union.union_type = req.union_type
                if req.marriage_year is not None:
                    single_union.marriage_year = req.marriage_year
                if req.marriage_place is not None:
                    single_union.marriage_place = req.marriage_place
            else:
                new_u = models.Union(
                    tree_id=tree_id,
                    partner1_id=target.id,
                    partner2_id=relative.id,
                    union_type=req.union_type,
                    marriage_year=req.marriage_year,
                    marriage_place=req.marriage_place,
                )
                db.add(new_u)

    elif req.relation == "child":
        union_to_use = None
        if req.union_id is not None:
            union_to_use = get_union_or_404(db, req.union_id)
            if union_to_use.tree_id != tree_id:
                raise HTTPException(status_code=400, detail="Союз принадлежит другому дереву")
        else:
            target_unions = db.scalars(
                select(models.Union).where(
                    models.Union.tree_id == tree_id,
                    (models.Union.partner1_id == target.id) | (models.Union.partner2_id == target.id),
                )
            ).all()
            if len(target_unions) >= 1:
                union_to_use = target_unions[0]
            else:
                union_to_use = models.Union(
                    tree_id=tree_id,
                    partner1_id=target.id,
                    partner2_id=None,
                    union_type="parents",
                )
                db.add(union_to_use)
                db.flush()

        existing_cr = db.scalar(
            select(models.ChildRelation).where(
                models.ChildRelation.union_id == union_to_use.id,
                models.ChildRelation.child_id == relative.id,
            )
        )
        if not existing_cr:
            db.add(
                models.ChildRelation(
                    tree_id=tree_id,
                    union_id=union_to_use.id,
                    child_id=relative.id,
                    relation_type=req.relation_type,
                )
            )

    elif req.relation == "parent":
        # Check if target already has a parent union
        parent_rels = db.scalars(
            select(models.ChildRelation).where(models.ChildRelation.child_id == target.id)
        ).all()

        if not parent_rels:
            parent_union = models.Union(
                tree_id=tree_id,
                partner1_id=relative.id,
                partner2_id=None,
                union_type=req.union_type,
                marriage_year=req.marriage_year,
                marriage_place=req.marriage_place,
            )
            db.add(parent_union)
            db.flush()
            db.add(
                models.ChildRelation(
                    tree_id=tree_id,
                    union_id=parent_union.id,
                    child_id=target.id,
                    relation_type=req.relation_type,
                )
            )
        else:
            parent_union = db.get(models.Union, parent_rels[0].union_id)
            if parent_union.partner1_id == relative.id or parent_union.partner2_id == relative.id:
                pass
            elif parent_union.partner1_id is None:
                parent_union.partner1_id = relative.id
            elif parent_union.partner2_id is None:
                parent_union.partner2_id = relative.id
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="У выбранного человека уже указаны оба родителя",
                )

    elif req.relation == "sibling":
        parent_rels = db.scalars(
            select(models.ChildRelation).where(models.ChildRelation.child_id == target.id)
        ).all()
        if not parent_rels:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Чтобы добавить брата или сестру, сначала укажите хотя бы одного родителя",
            )
        parent_union_id = parent_rels[0].union_id
        existing_cr = db.scalar(
            select(models.ChildRelation).where(
                models.ChildRelation.union_id == parent_union_id,
                models.ChildRelation.child_id == relative.id,
            )
        )
        if not existing_cr:
            db.add(
                models.ChildRelation(
                    tree_id=tree_id,
                    union_id=parent_union_id,
                    child_id=relative.id,
                    relation_type=req.relation_type,
                )
            )

    db.commit()
    db.refresh(relative)
    return relative


# --- Export & Import ---

def export_tree(db: Session, tree_id: int) -> schemas.TreeExportPayload:
    tree = get_tree_or_404(db, tree_id)
    persons_out = [
        schemas.ExportPersonItem(
            ref_id=p.id,
            **schemas.PersonBase.model_validate(p, from_attributes=True).model_dump(),
        )
        for p in tree.persons
    ]
    unions_out = [
        schemas.ExportUnionItem(
            ref_id=u.id,
            partner1_ref=u.partner1_id,
            partner2_ref=u.partner2_id,
            union_type=u.union_type,
            marriage_year=u.marriage_year,
            marriage_place=u.marriage_place,
            divorce_year=u.divorce_year,
            notes=u.notes,
        )
        for u in tree.unions
    ]
    children_out = [
        schemas.ExportChildItem(
            union_ref=cr.union_id,
            child_ref=cr.child_id,
            relation_type=cr.relation_type,
        )
        for cr in tree.child_relations
    ]
    return schemas.TreeExportPayload(
        version="1.0",
        name=tree.name,
        description=tree.description,
        persons=persons_out,
        unions=unions_out,
        child_relations=children_out,
    )


def import_tree(db: Session, payload: schemas.TreeExportPayload) -> models.Tree:
    tree = models.Tree(name=payload.name.strip(), description=payload.description)
    db.add(tree)
    db.flush()

    person_id_map: dict[int, int] = {}
    for p_item in payload.persons:
        p_data = p_item.model_dump(exclude={"ref_id"})
        person = models.Person(tree_id=tree.id, **p_data)
        db.add(person)
        db.flush()
        person_id_map[p_item.ref_id] = person.id

    union_id_map: dict[int, int] = {}
    for u_item in payload.unions:
        p1 = person_id_map.get(u_item.partner1_ref) if u_item.partner1_ref else None
        p2 = person_id_map.get(u_item.partner2_ref) if u_item.partner2_ref else None
        if p1 is None and p2 is None:
            continue
        if p1 is None and p2 is not None:
            p1, p2 = p2, None
        union = models.Union(
            tree_id=tree.id,
            partner1_id=p1,
            partner2_id=p2,
            union_type=u_item.union_type,
            marriage_year=u_item.marriage_year,
            marriage_place=u_item.marriage_place,
            divorce_year=u_item.divorce_year,
            notes=u_item.notes,
        )
        db.add(union)
        db.flush()
        union_id_map[u_item.ref_id] = union.id

    for cr_item in payload.child_relations:
        new_union_id = union_id_map.get(cr_item.union_ref)
        new_child_id = person_id_map.get(cr_item.child_ref)
        if new_union_id and new_child_id:
            db.add(
                models.ChildRelation(
                    tree_id=tree.id,
                    union_id=new_union_id,
                    child_id=new_child_id,
                    relation_type=cr_item.relation_type,
                )
            )

    db.commit()
    return get_tree_or_404(db, tree.id)


# --- Demo Tree Generator ---

def create_demo_tree(db: Session) -> models.Tree:
    payload = schemas.TreeExportPayload(
        name="Родословная Морозовых — Соколовых",
        description="Демонстрационное генеалогическое древо в 4 поколениях с архивными выписками и семейными связями.",
        persons=[
            # Generation 1 (Great-grandparents)
            schemas.ExportPersonItem(
                ref_id=1,
                first_name="Николай",
                middle_name="Петрович",
                last_name="Морозов",
                gender="male",
                birth_date="14.05.1888",
                birth_year=1888,
                death_date="22.11.1956",
                death_year=1956,
                is_alive=False,
                birth_place="г. Ярославль, Российская империя",
                death_place="г. Москва",
                burial_place="Введенское кладбище, Москва",
                occupation="Инженер-путеец, проектировщик мостов",
                education="Институт инженеров путей сообщения (Санкт-Петербург)",
                social_class="Мещане / потомственные почетные граждане",
                confession="Православие",
                archive_sources="ГАЯО, ф. 230, оп. 11, д. 412, л. 18 (метрическая книга о рождении).",
                biography="Руководил строительством железнодорожных переправ на Северной железной дороге. Увлекался картографией и собрал домашнюю библиотеку из 800 томов.",
            ),
            schemas.ExportPersonItem(
                ref_id=2,
                first_name="Елизавета",
                middle_name="Андреевна",
                last_name="Морозова",
                maiden_name="Воронцова",
                gender="female",
                birth_date="03.09.1892",
                birth_year=1892,
                death_date="10.02.1974",
                death_year=1974,
                is_alive=False,
                birth_place="г. Кострома",
                death_place="г. Москва",
                burial_place="Введенское кладбище, Москва",
                occupation="Преподаватель словесности и французского языка",
                education="Высшие женские курсы Герье",
                social_class="Дворяне",
                confession="Православие",
                archive_sources="ГАКО, ф. 56, оп. 3, д. 89, л. 44.",
                biography="Всю жизнь вела семейные дневники, благодаря которым удалось восстановить историю рода до конца XVIII века.",
            ),
            schemas.ExportPersonItem(
                ref_id=3,
                first_name="Илья",
                middle_name="Савельевич",
                last_name="Соколов",
                gender="male",
                birth_year=1890,
                is_birth_year_approx=True,
                death_year=1943,
                is_alive=False,
                birth_place="с. Спасское, Нижегородская губерния",
                death_place="Смоленская область",
                occupation="Часовой мастер, механик",
                social_class="Государственные крестьяне",
                confession="Православие",
                archive_sources="ЦАМО, ф. 58, оп. 18001, д. 714.",
                biography="Славился на весь уезд умением чинить сложные башенные и каминные часы.",
            ),
            schemas.ExportPersonItem(
                ref_id=4,
                first_name="Марфа",
                middle_name="Тимофеевна",
                last_name="Соколова",
                maiden_name="Крылова",
                gender="female",
                birth_date="19.07.1895",
                birth_year=1895,
                death_date="04.08.1981",
                death_year=1981,
                is_alive=False,
                birth_place="г. Нижний Новгород",
                death_place="г. Горький (Нижний Новгород)",
                occupation="Фельдшер городской больницы",
                confession="Православие",
                biography="Воспитала троих детей, более 40 лет проработала в городской клинической больнице.",
            ),
            # Generation 2 (Grandparents & Great-uncles/aunts)
            schemas.ExportPersonItem(
                ref_id=5,
                first_name="Всеволод",
                middle_name="Николаевич",
                last_name="Морозов",
                gender="male",
                birth_date="17.03.1921",
                birth_year=1921,
                death_date="29.09.1998",
                death_year=1998,
                is_alive=False,
                birth_place="г. Москва",
                death_place="г. Москва",
                occupation="Архитектор-реставратор",
                education="МАРХИ",
                biography="Участвовал в послевоенной реставрации памятников архитектуры в Новгороде и Пскове.",
            ),
            schemas.ExportPersonItem(
                ref_id=6,
                first_name="Вера",
                middle_name="Николаевна",
                last_name="Морозова",
                gender="female",
                birth_date="08.12.1925",
                birth_year=1925,
                death_date="15.05.2011",
                death_year=2011,
                is_alive=False,
                birth_place="г. Москва",
                death_place="г. Санкт-Петербург",
                occupation="Ботаник, научный сотрудник Ботанического сада",
                education="МГУ им. М. В. Ломоносова",
                biography="Участница более двадцати научных экспедиций на Алтай и Дальний Восток.",
            ),
            schemas.ExportPersonItem(
                ref_id=7,
                first_name="Надежда",
                middle_name="Ильинична",
                last_name="Морозова",
                maiden_name="Соколова",
                gender="female",
                birth_date="25.06.1924",
                birth_year=1924,
                death_date="11.01.2008",
                death_year=2008,
                is_alive=False,
                birth_place="г. Нижний Новгород",
                death_place="г. Москва",
                occupation="Врач-педиатр",
                education="Горьковский медицинский институт",
                biography="Познакомилась со Всеволодом Николаевичем в 1948 году во время командировки в Москву.",
            ),
            # Generation 3 (Parents & Uncles/Aunts)
            schemas.ExportPersonItem(
                ref_id=8,
                first_name="Андрей",
                middle_name="Всеволодович",
                last_name="Морозов",
                gender="male",
                birth_date="12.04.1952",
                birth_year=1952,
                is_alive=True,
                birth_place="г. Москва",
                residence_place="г. Москва",
                occupation="Физик-оптик, профессор",
                education="МФТИ",
                biography="Автор монографий по лазерной физике, увлекается горным туризмом и историей семьи.",
            ),
            schemas.ExportPersonItem(
                ref_id=9,
                first_name="Елена",
                middle_name="Сергеевна",
                last_name="Морозова",
                maiden_name="Белова",
                gender="female",
                birth_date="30.08.1955",
                birth_year=1955,
                is_alive=True,
                birth_place="г. Казань",
                residence_place="г. Москва",
                occupation="Музыкальный редактор, пианистка",
                education="Московская консерватория",
                biography="Организатор камерных концертов и архивариус семейных нотных тетрадей.",
            ),
            schemas.ExportPersonItem(
                ref_id=10,
                first_name="Ольга",
                middle_name="Всеволодовна",
                last_name="Левашова",
                maiden_name="Морозова",
                gender="female",
                birth_date="04.11.1956",
                birth_year=1956,
                is_alive=True,
                birth_place="г. Москва",
                residence_place="г. Санкт-Петербург",
                occupation="Искусствовед, куратор выставок",
                education="СПбГУ",
            ),
            # Generation 4 (Current generation)
            schemas.ExportPersonItem(
                ref_id=11,
                first_name="Дмитрий",
                middle_name="Андреевич",
                last_name="Морозов",
                gender="male",
                birth_date="18.02.1984",
                birth_year=1984,
                is_alive=True,
                birth_place="г. Москва",
                residence_place="г. Москва",
                occupation="Системный архитектор, разработчик ПО",
                education="МГТУ им. Н. Э. Баумана",
                biography="Составитель цифрового родословного древа семьи.",
            ),
            schemas.ExportPersonItem(
                ref_id=12,
                first_name="Мария",
                middle_name="Андреевна",
                last_name="Морозова",
                gender="female",
                birth_date="09.09.1988",
                birth_year=1988,
                is_alive=True,
                birth_place="г. Москва",
                residence_place="г. Калининград",
                occupation="Морской биолог, океанолог",
                education="МГУ им. М. В. Ломоносова",
            ),
            schemas.ExportPersonItem(
                ref_id=13,
                first_name="Анна",
                middle_name="Викторовна",
                last_name="Морозова",
                maiden_name="Орлова",
                gender="female",
                birth_date="21.05.1986",
                birth_year=1986,
                is_alive=True,
                birth_place="г. Екатеринбург",
                residence_place="г. Москва",
                occupation="Графический дизайнер и иллюстратор",
            ),
            # Generation 5 (Children)
            schemas.ExportPersonItem(
                ref_id=14,
                first_name="Лев",
                middle_name="Дмитриевич",
                last_name="Морозов",
                gender="male",
                birth_date="15.06.2015",
                birth_year=2015,
                is_alive=True,
                birth_place="г. Москва",
                residence_place="г. Москва",
                occupation="Школьник",
            ),
        ],
        unions=[
            schemas.ExportUnionItem(
                ref_id=101,
                partner1_ref=1,
                partner2_ref=2,
                union_type="married",
                marriage_year=1918,
                marriage_place="г. Ярославль",
            ),
            schemas.ExportUnionItem(
                ref_id=102,
                partner1_ref=3,
                partner2_ref=4,
                union_type="married",
                marriage_year=1920,
                marriage_place="г. Нижний Новгород",
            ),
            schemas.ExportUnionItem(
                ref_id=103,
                partner1_ref=5,
                partner2_ref=7,
                union_type="married",
                marriage_year=1949,
                marriage_place="г. Москва",
            ),
            schemas.ExportUnionItem(
                ref_id=104,
                partner1_ref=8,
                partner2_ref=9,
                union_type="married",
                marriage_year=1981,
                marriage_place="г. Москва",
            ),
            schemas.ExportUnionItem(
                ref_id=105,
                partner1_ref=11,
                partner2_ref=13,
                union_type="married",
                marriage_year=2012,
                marriage_place="г. Москва",
            ),
        ],
        child_relations=[
            schemas.ExportChildItem(union_ref=101, child_ref=5, relation_type="biological"),
            schemas.ExportChildItem(union_ref=101, child_ref=6, relation_type="biological"),
            schemas.ExportChildItem(union_ref=102, child_ref=7, relation_type="biological"),
            schemas.ExportChildItem(union_ref=103, child_ref=8, relation_type="biological"),
            schemas.ExportChildItem(union_ref=103, child_ref=10, relation_type="biological"),
            schemas.ExportChildItem(union_ref=104, child_ref=11, relation_type="biological"),
            schemas.ExportChildItem(union_ref=104, child_ref=12, relation_type="biological"),
            schemas.ExportChildItem(union_ref=105, child_ref=14, relation_type="biological"),
        ],
    )
    return import_tree(db, payload)
