from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class BookBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    author: str = Field(..., min_length=1, max_length=255)
    isbn: str = Field(..., min_length=3, max_length=20)
    genre: Optional[str] = "General"
    total_quantity: int = Field(1, ge=1)
    description: Optional[str] = None
    cover_url: Optional[str] = None


class BookCreate(BookBase):
    pass


class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    isbn: Optional[str] = None
    genre: Optional[str] = None
    total_quantity: Optional[int] = Field(None, ge=0)
    description: Optional[str] = None
    cover_url: Optional[str] = None


class BookOut(BookBase):
    id: int
    available_quantity: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MemberBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    email: str
    phone: Optional[str] = None
    membership_code: str = Field(..., min_length=3, max_length=50)


class MemberCreate(MemberBase):
    pass


class MemberUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    membership_code: Optional[str] = None
    is_active: Optional[bool] = None


class MemberOut(MemberBase):
    id: int
    is_active: bool
    joined_at: datetime
    active_loans_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class LoanCreate(BaseModel):
    book_id: int
    member_id: int
    days: int = Field(14, ge=1, le=90)


class LoanOut(BaseModel):
    id: int
    book_id: int
    member_id: int
    borrow_date: datetime
    due_date: datetime
    return_date: Optional[datetime] = None
    status: str
    book: Optional[BookOut] = None
    member: Optional[MemberOut] = None

    model_config = ConfigDict(from_attributes=True)


class LibraryStats(BaseModel):
    total_books: int
    total_copies: int
    available_copies: int
    borrowed_copies: int
    total_members: int
    active_loans: int
    overdue_loans: int
