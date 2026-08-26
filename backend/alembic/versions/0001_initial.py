"""Initial migration — create users, alerts, devices tables.

Revision ID: 0001
Revises:
Create Date: 2026-08-26
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: str | None = None
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade() -> None:
    # ------------------------------------------------------------------ users
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("role", sa.String(60), nullable=False, server_default="Read Only"),
        sa.Column("avatar", sa.String(10), nullable=False, server_default="?"),
        sa.Column("permissions", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("mfa_enabled", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("last_login", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ----------------------------------------------------------------- alerts
    op.create_table(
        "alerts",
        sa.Column("id", sa.String(20), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source", sa.String(60), nullable=False),
        sa.Column("destination", sa.String(120), nullable=False),
        sa.Column("source_port", sa.Integer(), nullable=False),
        sa.Column("destination_port", sa.Integer(), nullable=False),
        sa.Column("protocol", sa.String(20), nullable=False),
        sa.Column("country_of_origin", sa.String(60), nullable=False),
        sa.Column("risk_level", sa.String(20), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="OPEN"),
        sa.Column("type", sa.String(120), nullable=False),
        sa.Column("mitre_tactic", sa.String(80), nullable=True),
        sa.Column("confidence_score", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("false_positive_rate", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("cve_id", sa.String(30), nullable=True),
        sa.Column("user_affected", sa.String(120), nullable=True),
        sa.Column("assigned_to", sa.String(120), nullable=True),
        sa.Column("packets_transferred", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("bytes_transferred", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("timeline", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("tags", sa.JSON(), nullable=False, server_default="[]"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_alerts_timestamp", "alerts", ["timestamp"])
    op.create_index("ix_alerts_risk_level", "alerts", ["risk_level"])
    op.create_index("ix_alerts_status", "alerts", ["status"])

    # ---------------------------------------------------------------- devices
    op.create_table(
        "devices",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("hostname", sa.String(120), nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=False),
        sa.Column("os", sa.String(80), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="online"),
        sa.Column(
            "last_seen",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column("endpoints_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("risk_level", sa.String(20), nullable=False, server_default="LOW"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("hostname"),
    )


def downgrade() -> None:
    op.drop_table("devices")
    op.drop_index("ix_alerts_status", table_name="alerts")
    op.drop_index("ix_alerts_risk_level", table_name="alerts")
    op.drop_index("ix_alerts_timestamp", table_name="alerts")
    op.drop_table("alerts")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
