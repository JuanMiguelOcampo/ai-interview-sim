from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GEMINI_API_KEY: str
    DATABASE_URL: str

    class Config:
        env_file = ".env"
        extra = "ignore" # Ignores any extra variables in the .env file safely

settings = Settings()