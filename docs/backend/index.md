# B5 WAF Control Plane Backend Guide

This section covers the architecture and functionality of the B5 FastAPI backend (Tasks 71-80).

## 71. FastAPI Directory Structure
The backend is organized for scalability and clarity:
- `app/api/`: Contains route handlers partitioned by version and feature (e.g., `v1/rules.py`).
- `app/core/`: Centralized configuration, security settings, and global constants.
- `app/models/`: SQLAlchemy database models defining the schema.
- `app/schemas/`: Pydantic models for data validation and serialization.
- `app/crud/`: Reusable database operations (Create, Read, Update, Delete).
- `app/services/`: Complex business logic (e.g., synchronization service).

## 72. Pydantic Schemas for Validation
B5 uses **Pydantic v2** to enforce strict data types on incoming API requests.
- `RuleCreate`: Validates that a new rule has a valid name, a supported type (SQLi, XSS, etc.), and a valid regex pattern.
- `RuleUpdate`: Allows partial updates to existing rules while maintaining data integrity.
- `UserLogin`: Validates email/username and password formats.

## 73. SQLAlchemy ORM Models
The relational schema is mapped to Python classes using SQLAlchemy:
- **User**: Stores admin credentials, hashed passwords, and last login timestamps.
- **Rule**: Stores the security patterns and actions used by the proxy.
- **Policy**: Groups rules together and maps them to specific application domains or paths.
- **AuditLog**: Automatically records who changed what rule and when.

## 74. CRUD Operations for WAF Rules
Managing security rules is handled through a standardized CRUD pattern:
- **Create**: Inserts a new rule into PostgreSQL and triggers an immediate sync.
- **Read**: Supports pagination, filtering by type, and searching by name.
- **Update**: Modifies rule attributes.
- **Delete**: Supports soft-deletes to preserve audit history.

## 75. Rule Synchronization (Backend to Proxy)
When a rule is created or updated, the backend must inform the OpenResty proxy.
- **Mechanism**: The backend writes the updated rule set to **Redis**.
- **Lua Sync**: The OpenResty workers periodically check Redis (or receive a Pub/Sub notification) to reload the rules into memory without an Nginx restart.

## 76. JWT Authentication Flow
The Admin API is secured using JSON Web Tokens (JWT).
1. **Request**: Client sends credentials to `/api/v1/auth/login`.
2. **Verification**: Backend verifies the password hash.
3. **Issuance**: Backend returns a signed JWT containing the user ID and expiration.
4. **Access**: Client includes the token in the `Authorization: Bearer` header for subsequent calls.

## 77. Automated Testing with Pytest
B5 maintains a high standard of code quality through automated tests.
- **Setup**: Tests run against a temporary PostgreSQL/Redis instance using Docker.
- **Execution**: Run `pytest` from the `backend/` directory.
- **Coverage**: Includes unit tests for CRUD logic and integration tests for API endpoints.

## 78. Database Migrations with Alembic
Schema changes are managed using **Alembic**.
- **Generate**: Run `alembic revision --autogenerate -m "description"` after changing a model.
- **Apply**: Run `alembic upgrade head` to apply changes to the database.
- **History**: All changes are versioned and stored in the `alembic/versions` directory.

## 79. Auto-Generated Swagger Documentation
FastAPI automatically generates interactive API documentation.
- **Swagger UI**: Accessible at `/docs`. Allows developers to test endpoints directly from the browser.
- **ReDoc**: Accessible at `/redoc`. Provides a clean, read-only version of the API documentation.

## 80. Extending the Backend
B5 is built with a modular architecture to allow for easy expansion.
- **Adding a Module**:
  1. Define a new SQLAlchemy model in `app/models/`.
  2. Create Pydantic schemas in `app/schemas/`.
  3. Implement CRUD logic in `app/crud/`.
  4. Register new routes in `app/api/` and include them in `main.py`.
