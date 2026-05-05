from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    API_V1_PREFIX: str = "/api/v1"

    class Config:
        env_file = ".env"


settings = Settings()
