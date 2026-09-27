from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from api.database import Base


class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    author = Column(String(255), nullable=False, index=True)
    isbn = Column(String(20), unique=True, nullable=False, index=True)
    genre = Column(String(100), nullable=True, default="General")
    total_quantity = Column(Integer, nullable=False, default=1)
    available_quantity = Column(Integer, nullable=False, default=1)
    description = Column(Text, nullable=True)
    cover_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    loans = relationship("Loan", back_populates="book", cascade="all, delete-orphan")


class Member(Base):
    __tablename__ = "members"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    membership_code = Column(String(50), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    joined_at = Column(DateTime, default=datetime.utcnow)

    loans = relationship("Loan", back_populates="member", cascade="all, delete-orphan")


class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    member_id = Column(Integer, ForeignKey("members.id"), nullable=False)
    borrow_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    due_date = Column(DateTime, nullable=False)
    return_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="borrowed", nullable=False)

    book = relationship("Book", back_populates="loans")
    member = relationship("Member", back_populates="loans")
