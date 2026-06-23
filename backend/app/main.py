from typing import Any
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.patch("/users/{user_id}")
def update_user(user_id: int, email: str):
    
    pass

@app.post("/login")
def authenticate(q: Any = None) -> dict[str, Any]:
    if q:
        return {"q": q}
    return {"message": "No query parameter provided"}

@app.get("/fleet")
def get_fleet():
    return {"message": "Fleet endpoint"}

@app.get("/robots/{robot_id}/dashboard")
def get_robot_dashboard(robot_id: int):
    return {"message": f"Dashboard endpoint for robot ID: {robot_id}"}

@app.get("/robots/{robot_id}/statistiques")
def get_robot_statistics(robot_id: int):
    return {"message": f"Statistics endpoint for robot ID: {robot_id}"}

@app.get("/robots/{robot_id}/alertes")
def get_robot_alerts(robot_id: int):
    return {"message": f"Alerts endpoint for robot ID: {robot_id}"}

@app.get("/robots/{robot_id}/rapports")
def get_robot_reports(robot_id: int):
    return {"message": f"Reports endpoint for robot ID: {robot_id}"}

@app.get("/gestion")
def get_gestion():
    return {"message": "Gestion endpoint"}

@app.post("/gestion")
def add_robot(robot_data: Any):
    return {"message": "Robot added", "data": robot_data}

@app.post("/gestion")
def add_client(client_data: Any):
    return {"message": "Client added", "data": client_data}

@app.post("/gestion")
def add_admin(admin_data: Any):
    return {"message": "Admin added", "data": admin_data}

@app.delete("/gestion/{entity_id}")
def delete_entity(entity_id: int):
    return {"message": f"Entity with ID {entity_id} deleted"}

