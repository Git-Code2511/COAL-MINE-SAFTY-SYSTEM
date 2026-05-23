import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, Float, String, Boolean, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "sqlite:///./mine_safety.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Config(Base):
    __tablename__ = "configs"
    id = Column(Integer, primary_key=True, index=True)
    parameter = Column(String, unique=True, index=True)
    value = Column(Float)
    unit = Column(String)
    description = Column(String)

class Telemetry(Base):
    __tablename__ = "telemetry"
    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(String, index=True)
    node_name = Column(String)
    methane = Column(Float)
    co = Column(Float)
    temperature = Column(Float)
    humidity = Column(Float)
    risk_index = Column(Float)
    risk_level = Column(String) # "SAFE", "WARNING", "CRITICAL"
    timestamp = Column(DateTime, default=datetime.utcnow)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(String, index=True)
    node_name = Column(String)
    parameter = Column(String)
    value = Column(Float)
    threshold = Column(Float)
    message = Column(String)
    severity = Column(String) # "WARNING" or "CRITICAL"
    timestamp = Column(DateTime, default=datetime.utcnow)
    resolved = Column(Boolean, default=False)

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Seed default thresholds if empty
    if db.query(Config).count() == 0:
        default_configs = [
            Config(parameter="methane_warning", value=1.0, unit="%", description="Methane Warning level"),
            Config(parameter="methane_critical", value=1.5, unit="%", description="Methane Critical level (immediate risk)"),
            Config(parameter="co_warning", value=35.0, unit="ppm", description="Carbon Monoxide Warning level"),
            Config(parameter="co_critical", value=50.0, unit="ppm", description="Carbon Monoxide Critical level"),
            Config(parameter="temp_warning", value=35.0, unit="°C", description="Temperature Warning level"),
            Config(parameter="temp_critical", value=40.0, unit="°C", description="Temperature Critical level"),
            Config(parameter="humidity_warning", value=85.0, unit="%", description="Humidity Warning level"),
            Config(parameter="humidity_critical", value=95.0, unit="%", description="Humidity Critical level"),
        ]
        db.add_all(default_configs)
        db.commit()
    db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
