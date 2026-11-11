from fastapi.testclient import TestClient


def test_export_and_import_tree(client: TestClient):
    # Create demo tree
    demo = client.post("/api/trees/demo").json()
    demo_id = demo["id"]
    orig_person_count = len(demo["persons"])
    orig_union_count = len(demo["unions"])
    orig_rel_count = len(demo["child_relations"])

    # Export tree
    exp_res = client.get(f"/api/trees/{demo_id}/export")
    assert exp_res.status_code == 200
    export_payload = exp_res.json()
    export_payload["name"] = "Импортированная копия"

    # Import into a new tree
    imp_res = client.post("/api/trees/import", json=export_payload)
    assert imp_res.status_code == 201
    imported = imp_res.json()

    assert imported["id"] != demo_id
    assert imported["name"] == "Импортированная копия"
    assert len(imported["persons"]) == orig_person_count
    assert len(imported["unions"]) == orig_union_count
    assert len(imported["child_relations"]) == orig_rel_count
