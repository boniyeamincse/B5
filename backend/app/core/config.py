from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "B5 WAF Control Plane"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    POSTGRES_USER: str = "b5admin"
    POSTGRES_PASSWORD: str = "b5password"
    POSTGRES_SERVER: str = "b5-postgres"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "b5"
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    REDIS_HOST: str = "b5-redis"
    REDIS_PORT: int = 6379
    
    JWT_SECRET: str = "DEVELOPMENT_SECRET_KEY_CHANGE_ME"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days

    CORS_ORIGINS: List[str] = ["*"]

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
