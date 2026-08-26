from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/sybrai"
    SECRET_KEY: str = "sybrai_dev_secret_key_change_in_production_abc123xyz"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:4173"

    # AI & Anomaly Detection
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-3-5-sonnet-20241022"
    ANOMALY_THRESHOLD: float = 0.65

    # Local LLM & MCP Integration
    LOCAL_LLM_PROVIDER: str = "ollama"  # "ollama" or "openai_compatible"
    LOCAL_LLM_BASE_URL: str = "http://localhost:11434"
    LOCAL_LLM_MODEL: str = "llama3.1:latest"
    LOCAL_LLM_API_KEY: str = "ollama"
    MCP_CONFIG_PATH: str = "C:/Users/abbus/.gemini/config/mcp_config.json"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]


settings = Settings()
