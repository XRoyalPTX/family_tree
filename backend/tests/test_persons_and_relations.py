from fastapi.testclient import TestClient


def test_person_crud_and_detailed_fields(client: TestClient):
    tree_id = client.post("/api/trees", json={"name": "Тестовое дерево"}).json()["id"]

    # Create person with full archival/genealogical fields
    create_res = client.post(
        f"/api/trees/{tree_id}/persons",
        json={
            "first_name": "Александр",
            "middle_name": "Иванович",
            "last_name": "Бестужев",
            "gender": "male",
            "birth_date": "11.09.1875",
            "birth_year": 1875,
            "is_birth_year_approx": True,
            "death_year": 1938,
            "is_alive": False,
            "birth_place": "г. Тверь",
            "death_place": "г. Ленинград",
            "burial_place": "Смоленское кладбище",
            "occupation": "Инженер-механик",
            "education": "Технологический институт",
            "social_class": "Дворяне",
            "confession": "Православие",
            "archive_sources": "ЦГИА СПб, ф. 19, оп. 127, д. 312",
            "biography": "Работал на Путиловском заводе, собирал редкие книги.",
        },
    )
    assert create_res.status_code == 201
    person = create_res.json()
    assert person["first_name"] == "Александр"
    assert person["social_class"] == "Дворяне"
    assert person["is_alive"] is False

    # Update person
    upd_res = client.put(
        f"/api/persons/{person['id']}",
        json={"occupation": "Главный инженер", "residence_place": "Санкт-Петербург"},
    )
    assert upd_res.status_code == 200
    assert upd_res.json()["occupation"] == "Главный инженер"
    assert upd_res.json()["residence_place"] == "Санкт-Петербург"

    # Fetch person
    get_res = client.get(f"/api/persons/{person['id']}")
    assert get_res.status_code == 200
    assert get_res.json()["archive_sources"] == "ЦГИА СПб, ф. 19, оп. 127, д. 312"


def test_contextual_relatives_and_safe_deletion(client: TestClient):
    tree_id = client.post("/api/trees", json={"name": "Семья Орловых"}).json()["id"]

    # 1. Create root person (Son)
    son = client.post(
        f"/api/trees/{tree_id}/persons",
        json={"first_name": "Иван", "last_name": "Орлов", "gender": "male", "birth_year": 1980},
    ).json()

    # 2. Add Father via contextual relative endpoint
    father_res = client.post(
        f"/api/persons/{son['id']}/relatives",
        json={
            "relation": "parent",
            "new_person": {
                "first_name": "Петр",
                "last_name": "Орлов",
                "gender": "male",
                "birth_year": 1955,
            },
        },
    )
    assert father_res.status_code == 201
    father = father_res.json()

    # 3. Add Mother via contextual relative endpoint (should pair with Father in the same Union!)
    mother_res = client.post(
        f"/api/persons/{son['id']}/relatives",
        json={
            "relation": "parent",
            "new_person": {
                "first_name": "Анна",
                "last_name": "Орлова",
                "maiden_name": "Смирнова",
                "gender": "female",
                "birth_year": 1957,
            },
        },
    )
    assert mother_res.status_code == 201
    mother = mother_res.json()

    # Verify that trying to add a 3rd parent fails cleanly
    third_parent_res = client.post(
        f"/api/persons/{son['id']}/relatives",
        json={
            "relation": "parent",
            "new_person": {"first_name": "Лишний", "gender": "male"},
        },
    )
    assert third_parent_res.status_code == 400

    # 4. Add Sister (sibling of Son)
    sister_res = client.post(
        f"/api/persons/{son['id']}/relatives",
        json={
            "relation": "sibling",
            "new_person": {
                "first_name": "Екатерина",
                "last_name": "Орлова",
                "gender": "female",
                "birth_year": 1983,
            },
        },
    )
    assert sister_res.status_code == 201
    sister = sister_res.json()

    # 5. Add Spouse to Son
    spouse_res = client.post(
        f"/api/persons/{son['id']}/relatives",
        json={
            "relation": "spouse",
            "marriage_year": 2005,
            "new_person": {
                "first_name": "Мария",
                "last_name": "Орлова",
                "gender": "female",
                "birth_year": 1982,
            },
        },
    )
    assert spouse_res.status_code == 201
    spouse = spouse_res.json()

    # 6. Add Child to Son (automatically attached to Son+Spouse union)
    child_res = client.post(
        f"/api/persons/{son['id']}/relatives",
        json={
            "relation": "child",
            "new_person": {
                "first_name": "Максим",
                "last_name": "Орлов",
                "gender": "male",
                "birth_year": 2010,
            },
        },
    )
    assert child_res.status_code == 201
    child = child_res.json()

    # Check full tree state
    tree_full = client.get(f"/api/trees/{tree_id}").json()
    assert len(tree_full["persons"]) == 6
    assert len(tree_full["unions"]) == 2
    assert len(tree_full["child_relations"]) == 3

    # 7. Delete Father and verify Mother, Son, Sister, Spouse, Child remain intact!
    del_father = client.delete(f"/api/persons/{father['id']}")
    assert del_father.status_code == 204

    tree_after = client.get(f"/api/trees/{tree_id}").json()
    remaining_ids = {p["id"] for p in tree_after["persons"]}
    assert father["id"] not in remaining_ids
    assert {mother["id"], son["id"], sister["id"], spouse["id"], child["id"]}.issubset(remaining_ids)


def test_link_existing_persons_and_unions_api(client: TestClient):
    tree_id = client.post("/api/trees", json={"name": "Связи существующих"}).json()["id"]

    p1 = client.post(
        f"/api/trees/{tree_id}/persons",
        json={"first_name": "Сергей", "last_name": "Волков", "gender": "male", "birth_year": 1960},
    ).json()
    p2 = client.post(
        f"/api/trees/{tree_id}/persons",
        json={"first_name": "Татьяна", "last_name": "Волкова", "gender": "female", "birth_year": 1962},
    ).json()
    p3 = client.post(
        f"/api/trees/{tree_id}/persons",
        json={"first_name": "Денис", "last_name": "Волков", "gender": "male", "birth_year": 1990},
    ).json()

    # Link existing p2 as spouse of p1
    link_spouse = client.post(
        f"/api/persons/{p1['id']}/relatives",
        json={"relation": "spouse", "existing_person_id": p2["id"], "marriage_year": 1985},
    )
    assert link_spouse.status_code == 201

    # Link existing p3 as child of p1
    link_child = client.post(
        f"/api/persons/{p1['id']}/relatives",
        json={"relation": "child", "existing_person_id": p3["id"]},
    )
    assert link_child.status_code == 201

    tree_data = client.get(f"/api/trees/{tree_id}").json()
    assert len(tree_data["unions"]) == 1
    union_id = tree_data["unions"][0]["id"]
    assert tree_data["unions"][0]["marriage_year"] == 1985

    # Update union metadata
    upd_u = client.put(
        f"/api/unions/{union_id}",
        json={"marriage_place": "г. Ярославль", "notes": "Венчание и регистрация"},
    )
    assert upd_u.status_code == 200
    assert upd_u.json()["marriage_place"] == "г. Ярославль"

    # Remove child from union without deleting person
    rem_c = client.delete(f"/api/unions/{union_id}/children/{p3['id']}")
    assert rem_c.status_code == 204
    assert client.get(f"/api/persons/{p3['id']}").status_code == 200

