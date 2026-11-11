from fastapi.testclient import TestClient


def test_health_check(client: TestClient):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_create_list_update_delete_trees(client: TestClient):
    # Create first tree
    res1 = client.post(
        "/api/trees",
        json={"name": "Линия отца", "description": "Родословная по отцовской ветке"},
    )
    assert res1.status_code == 201
    t1 = res1.json()
    assert t1["name"] == "Линия отца"
    assert t1["person_count"] == 0

    # Create second tree
    res2 = client.post(
        "/api/trees",
        json={"name": "Линия матери", "description": "Родословная по материнской ветке"},
    )
    assert res2.status_code == 201
    t2 = res2.json()

    # List trees
    list_res = client.get("/api/trees")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 2

    # Update tree
    upd_res = client.put(
        f"/api/trees/{t1['id']}",
        json={"name": "Древо Морозовых", "description": "Обновленное описание"},
    )
    assert upd_res.status_code == 200
    assert upd_res.json()["name"] == "Древо Морозовых"

    # Delete second tree
    del_res = client.delete(f"/api/trees/{t2['id']}")
    assert del_res.status_code == 204

    # Verify 404 after delete
    get_res = client.get(f"/api/trees/{t2['id']}")
    assert get_res.status_code == 404


def test_demo_tree_creation(client: TestClient):
    res = client.post("/api/trees/demo")
    assert res.status_code == 201
    data = res.json()
    assert len(data["persons"]) >= 12
    assert len(data["unions"]) >= 5
    assert len(data["child_relations"]) >= 7
