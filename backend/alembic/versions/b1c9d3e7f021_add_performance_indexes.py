"""add performance indexes for fast rule lookups

Revision ID: b1c9d3e7f021
Revises: ae3eb2590e68
Create Date: 2026-05-03
"""
from alembic import op

revision = "b1c9d3e7f021"
down_revision = "ae3eb2590e68"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_rules_type_enabled",         "rules",              ["type",            "enabled"])
    op.create_index("ix_rules_action_enabled",        "rules",              ["action",          "enabled"])
    op.create_index("ix_policies_is_default",         "policies",           ["is_default"])
    op.create_index("ix_audit_logs_user_created",     "audit_logs",         ["user_id",         "created_at"])
    op.create_index("ix_audit_logs_resource",         "audit_logs",         ["resource_type",   "resource_id"])
    op.create_index("ix_rlc_identifier_type_enabled", "rate_limit_configs", ["identifier_type", "enabled"])
    op.create_index("ix_rlc_policy_enabled",          "rate_limit_configs", ["policy_id",       "enabled"])
    op.create_index("ix_ec_path_enabled",             "endpoint_configs",   ["path_prefix",     "enabled"])
    op.create_index("ix_ec_policy_enabled",           "endpoint_configs",   ["policy_id",       "enabled"])


def downgrade() -> None:
    op.drop_index("ix_ec_policy_enabled",           table_name="endpoint_configs")
    op.drop_index("ix_ec_path_enabled",             table_name="endpoint_configs")
    op.drop_index("ix_rlc_policy_enabled",          table_name="rate_limit_configs")
    op.drop_index("ix_rlc_identifier_type_enabled", table_name="rate_limit_configs")
    op.drop_index("ix_audit_logs_resource",         table_name="audit_logs")
    op.drop_index("ix_audit_logs_user_created",     table_name="audit_logs")
    op.drop_index("ix_policies_is_default",         table_name="policies")
    op.drop_index("ix_rules_action_enabled",        table_name="rules")
    op.drop_index("ix_rules_type_enabled",          table_name="rules")
