from fastapi import FastAPI

app = FastAPI(
    title="Aswar Traffic Intelligence API",
    version="0.1.0",
)


@app.get("/")
def root():
    return {
        "message": "Aswar Traffic Intelligence API is running"
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "ok"
    }
    