from datetime import datetime, timezone
import uuid
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def gen_uuid() -> str:
    return str(uuid.uuid4())


class Role(Base):
    __tablename__ = "roles"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(64), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=False)


class Permission(Base):
    __tablename__ = "permissions"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    role_id = Column(String(36), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    scope = Column(String(128), nullable=False)


class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    display_name = Column(String(128), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role_id = Column(String(36), ForeignKey("roles.id"), nullable=True)
    is_verified = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    preferences = relationship("UserPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")


class UserSession(Base):
    __tablename__ = "user_sessions"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(128), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    user = relationship("User", back_populates="sessions")


class UserPreference(Base):
    __tablename__ = "user_preferences"
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    theme = Column(String(16), default="dark", nullable=False)
    followed_topics_json = Column(Text, default="[]", nullable=False)
    dashboard_widgets_json = Column(Text, default="[]", nullable=False)
    default_research_mode = Column(String(32), default="deep", nullable=False)
    user = relationship("User", back_populates="preferences")


class GeographicRegion(Base):
    __tablename__ = "geographic_regions"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    code = Column(String(32), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False)


class Country(Base):
    __tablename__ = "countries"
    iso3 = Column(String(3), primary_key=True)
    iso2 = Column(String(2), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False, index=True)
    official_name = Column(String(255), nullable=False)
    capital = Column(String(128), nullable=False)
    region_code = Column(String(64), nullable=False, index=True)
    population = Column(Integer, nullable=False)
    area_sq_km = Column(Float, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    currency_code = Column(String(16), nullable=False)
    languages_json = Column(Text, default="[]", nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class EconomicIndicator(Base):
    __tablename__ = "economic_indicators"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    country_iso3 = Column(String(3), ForeignKey("countries.iso3", ondelete="CASCADE"), nullable=False, index=True)
    indicator_code = Column(String(64), nullable=False, index=True)
    indicator_name = Column(String(255), nullable=False)
    category = Column(String(64), nullable=False)
    year = Column(Integer, nullable=False, index=True)
    value = Column(Float, nullable=True)
    units = Column(String(64), nullable=False)
    source_provider = Column(String(128), nullable=False)
    source_url = Column(String(512), nullable=False)
    methodology = Column(Text, nullable=True)
    retrieved_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("country_iso3", "indicator_code", "year", name="uq_country_indicator_year"),
    )


class KnowledgeEntity(Base):
    __tablename__ = "knowledge_entities"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    slug = Column(String(128), unique=True, nullable=False, index=True)
    label = Column(String(255), nullable=False, index=True)
    category = Column(String(64), nullable=False, index=True)
    summary = Column(Text, nullable=False)
    source_provider = Column(String(128), nullable=False)
    verification_status = Column(String(32), default="verified", nullable=False)


class EntityRelationship(Base):
    __tablename__ = "entity_relationships"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    source_entity_id = Column(String(36), ForeignKey("knowledge_entities.id", ondelete="CASCADE"), nullable=False, index=True)
    target_entity_id = Column(String(36), ForeignKey("knowledge_entities.id", ondelete="CASCADE"), nullable=False, index=True)
    relationship_type = Column(String(64), nullable=False, index=True)
    weight = Column(Float, default=0.8, nullable=False)
    evidence_summary = Column(Text, nullable=False)
    citation_url = Column(String(512), nullable=True)
    is_hypothesis = Column(Boolean, default=False, nullable=False)


class KnowledgeGraphRecord(Base):
    __tablename__ = "knowledge_graphs"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    root_topic = Column(String(255), nullable=False)
    layout_mode = Column(String(32), default="force", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class GraphNodeRecord(Base):
    __tablename__ = "graph_nodes"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    graph_id = Column(String(36), ForeignKey("knowledge_graphs.id", ondelete="CASCADE"), nullable=False, index=True)
    node_key = Column(String(128), nullable=False)
    label = Column(String(255), nullable=False)
    category = Column(String(64), nullable=False)


class GraphEdgeRecord(Base):
    __tablename__ = "graph_edges"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    graph_id = Column(String(36), ForeignKey("knowledge_graphs.id", ondelete="CASCADE"), nullable=False, index=True)
    source_key = Column(String(128), nullable=False)
    target_key = Column(String(128), nullable=False)
    relationship_type = Column(String(64), nullable=False)


class ResearchProject(Base):
    __tablename__ = "research_projects"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class ResearchReportRecord(Base):
    __tablename__ = "research_reports"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    project_id = Column(String(36), ForeignKey("research_projects.id", ondelete="SET NULL"), nullable=True)
    query = Column(String(512), nullable=False, index=True)
    mode = Column(String(32), nullable=False)
    executive_summary = Column(Text, nullable=False)
    analysis_markdown = Column(Text, nullable=False)
    limitations_markdown = Column(Text, nullable=False)
    conclusions_markdown = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class ResearchSourceRecord(Base):
    __tablename__ = "research_sources"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    report_id = Column(String(36), ForeignKey("research_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(512), nullable=False)
    publisher = Column(String(255), nullable=False)
    published_date = Column(String(64), nullable=False)
    retrieved_at = Column(String(64), nullable=False)
    url = Column(String(512), nullable=False)
    source_type = Column(String(64), nullable=False)


class ExtractedClaimRecord(Base):
    __tablename__ = "extracted_claims"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    report_id = Column(String(36), ForeignKey("research_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id = Column(String(36), ForeignKey("research_sources.id", ondelete="SET NULL"), nullable=True)
    claim_text = Column(Text, nullable=False)
    verification_status = Column(String(32), nullable=False)


class HistoricalEventRecord(Base):
    __tablename__ = "historical_events"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    slug = Column(String(128), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    year_numeric = Column(Integer, nullable=False, index=True)
    era = Column(String(64), nullable=False, index=True)
    category = Column(String(64), nullable=False, index=True)
    country_iso3 = Column(String(3), nullable=True, index=True)
    description = Column(Text, nullable=False)


class TimelineRecord(Base):
    __tablename__ = "timelines"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    events_json = Column(Text, default="[]", nullable=False)


class SimulationModelRecord(Base):
    __tablename__ = "simulation_models"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    slug = Column(String(128), unique=True, nullable=False, index=True)
    category = Column(String(64), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    version = Column(String(32), nullable=False)
    equations_latex = Column(Text, nullable=False)
    limitations_text = Column(Text, nullable=False)


class SimulationRunRecord(Base):
    __tablename__ = "simulation_runs"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    model_slug = Column(String(128), nullable=False, index=True)
    horizon_years = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class SimulationInputRecord(Base):
    __tablename__ = "simulation_inputs"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    run_id = Column(String(36), ForeignKey("simulation_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    parameter_key = Column(String(128), nullable=False)
    baseline_value = Column(Float, nullable=False)
    modified_value = Column(Float, nullable=False)


class SimulationResultRecord(Base):
    __tablename__ = "simulation_results"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    run_id = Column(String(36), ForeignKey("simulation_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    year_offset = Column(Integer, nullable=False)
    baseline_value = Column(Float, nullable=False)
    modified_p10 = Column(Float, nullable=False)
    modified_p50 = Column(Float, nullable=False)
    modified_p90 = Column(Float, nullable=False)


class SavedCollectionRecord(Base):
    __tablename__ = "saved_collections"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(128), nullable=False)
    folder = Column(String(128), default="General", nullable=False)
    tags_json = Column(Text, default="[]", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class BookmarkRecord(Base):
    __tablename__ = "bookmarks"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    item_type = Column(String(64), nullable=False)
    item_ref = Column(String(255), nullable=False)
    title = Column(String(255), nullable=False)
    notes = Column(Text, default="", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class NotificationRecord(Base):
    __tablename__ = "notifications"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class DataProviderRecord(Base):
    __tablename__ = "data_provider_records"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    provider_slug = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False)
    base_url = Column(String(512), nullable=False)
    license_type = Column(String(128), nullable=False)
    status = Column(String(32), default="operational", nullable=False)
    last_verified_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class AuditEventRecord(Base):
    __tablename__ = "audit_events"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), nullable=True, index=True)
    action = Column(String(128), nullable=False, index=True)
    resource_type = Column(String(64), nullable=False)
    resource_id = Column(String(128), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    __table_args__ = (Index("ix_audit_created_at", "created_at"),)
