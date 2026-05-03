from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.sql import func
from ..core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Rule(Base):
    __tablename__ = "rules"
    __table_args__ = (
        Index('ix_rules_type_enabled',   'type',   'enabled'),
        Index('ix_rules_action_enabled', 'action', 'enabled'),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, index=True, nullable=False) # sqli, xss, lfi, etc.
    pattern = Column(Text, nullable=False)
    action = Column(String, default="block") # allow, block, log
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Policy(Base):
    __tablename__ = "policies"
    __table_args__ = (
        Index('ix_policies_is_default', 'is_default'),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index('ix_audit_logs_user_created', 'user_id',       'created_at'),
        Index('ix_audit_logs_resource',     'resource_type', 'resource_id'),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    action = Column(String, nullable=False) # create_rule, update_policy, etc.
    resource_type = Column(String)
    resource_id = Column(Integer)
    details = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class RateLimitConfig(Base):
    """Database-backed, per-route / per-identifier rate-limit overrides.

    Rows here take precedence over the static route_rate_limits in init.lua.
    The control-plane backend syncs active rows to Redis so the proxy can
    pick them up without a reload.
    """
    __tablename__ = "rate_limit_configs"
    __table_args__ = (
        Index('ix_rlc_identifier_type_enabled', 'identifier_type', 'enabled'),
        Index('ix_rlc_policy_enabled',          'policy_id',       'enabled'),
    )

    id = Column(Integer, primary_key=True, index=True)
    # Identifier: an IP, CIDR, user role, or route prefix such as "/api/login"
    identifier = Column(String, nullable=False, index=True)
    identifier_type = Column(String, nullable=False, index=True)  # "ip" | "route" | "role"
    requests = Column(Integer, nullable=False)          # max requests per window
    window_seconds = Column(Integer, nullable=False)    # sliding window duration
    enabled = Column(Boolean, default=True, index=True)
    # Optional FK to a Policy so limits can be grouped by application
    policy_id = Column(Integer, ForeignKey("policies.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class EndpointConfig(Base):
    """API strict-mode whitelisting — defines which methods and content-types
    are permitted for a given path prefix.  The proxy can optionally enforce
    these rules, rejecting any request that does not match.
    """
    __tablename__ = "endpoint_configs"
    __table_args__ = (
        Index('ix_ec_path_enabled',   'path_prefix', 'enabled'),
        Index('ix_ec_policy_enabled', 'policy_id',   'enabled'),
    )

    id = Column(Integer, primary_key=True, index=True)
    path_prefix = Column(String, nullable=False, index=True)     # e.g. "/api/v1/users"
    allowed_methods = Column(String, nullable=False)              # comma-sep: "GET,POST"
    allowed_content_types = Column(String, nullable=True)         # comma-sep or NULL = any
    require_auth = Column(Boolean, default=True)
    strict_mode = Column(Boolean, default=False)  # if True, reject non-listed methods
    enabled = Column(Boolean, default=True, index=True)
    policy_id = Column(Integer, ForeignKey("policies.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
