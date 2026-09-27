from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from api import models, schemas


def get_books(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    genre: Optional[str] = None
) -> List[models.Book]:
    query = db.query(models.Book)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                models.Book.title.ilike(search_filter),
                models.Book.author.ilike(search_filter),
                models.Book.isbn.ilike(search_filter)
            )
        )
    if genre and genre != "All":
        query = query.filter(models.Book.genre.ilike(genre))
    return query.order_by(models.Book.title.asc()).offset(skip).limit(limit).all()


def get_book_by_id(db: Session, book_id: int) -> Optional[models.Book]:
    return db.query(models.Book).filter(models.Book.id == book_id).first()


def get_book_by_isbn(db: Session, isbn: str) -> Optional[models.Book]:
    return db.query(models.Book).filter(models.Book.isbn == isbn).first()


def create_book(db: Session, book: schemas.BookCreate) -> models.Book:
    db_book = models.Book(
        title=book.title.strip(),
        author=book.author.strip(),
        isbn=book.isbn.strip(),
        genre=book.genre.strip() if book.genre else "General",
        total_quantity=book.total_quantity,
        available_quantity=book.total_quantity,
        description=book.description.strip() if book.description else None,
        cover_url=book.cover_url.strip() if book.cover_url else None
    )
    db.add(db_book)
    db.commit()
    db.refresh(db_book)
    return db_book


def update_book(db: Session, book_id: int, book_update: schemas.BookUpdate) -> Optional[models.Book]:
    db_book = get_book_by_id(db, book_id)
    if not db_book:
        return None

    update_data = book_update.model_dump(exclude_unset=True)

    if "total_quantity" in update_data:
        diff = update_data["total_quantity"] - db_book.total_quantity
        new_available = db_book.available_quantity + diff
        db_book.available_quantity = max(0, new_available)

    for field, value in update_data.items():
        if field != "total_quantity" and value is not None:
            if isinstance(value, str):
                value = value.strip()
            setattr(db_book, field, value)

    db.commit()
    db.refresh(db_book)
    return db_book


def delete_book(db: Session, book_id: int) -> bool:
    db_book = get_book_by_id(db, book_id)
    if not db_book:
        return False
    db.delete(db_book)
    db.commit()
    return True


def get_members(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None
) -> List[models.Member]:
    query = db.query(models.Member)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                models.Member.full_name.ilike(search_filter),
                models.Member.email.ilike(search_filter),
                models.Member.membership_code.ilike(search_filter)
            )
        )
    return query.order_by(models.Member.full_name.asc()).offset(skip).limit(limit).all()


def get_member_by_id(db: Session, member_id: int) -> Optional[models.Member]:
    return db.query(models.Member).filter(models.Member.id == member_id).first()


def get_member_by_email(db: Session, email: str) -> Optional[models.Member]:
    return db.query(models.Member).filter(models.Member.email == email).first()


def get_member_by_code(db: Session, code: str) -> Optional[models.Member]:
    return db.query(models.Member).filter(models.Member.membership_code == code).first()


def create_member(db: Session, member: schemas.MemberCreate) -> models.Member:
    db_member = models.Member(
        full_name=member.full_name.strip(),
        email=member.email.lower().strip(),
        phone=member.phone.strip() if member.phone else None,
        membership_code=member.membership_code.strip()
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member


def update_member(db: Session, member_id: int, member_update: schemas.MemberUpdate) -> Optional[models.Member]:
    db_member = get_member_by_id(db, member_id)
    if not db_member:
        return None

    update_data = member_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            if field == "email" and isinstance(value, str):
                value = value.lower().strip()
            elif isinstance(value, str):
                value = value.strip()
            setattr(db_member, field, value)

    db.commit()
    db.refresh(db_member)
    return db_member


def delete_member(db: Session, member_id: int) -> bool:
    db_member = get_member_by_id(db, member_id)
    if not db_member:
        return False
    db.delete(db_member)
    db.commit()
    return True


def update_overdue_loans(db: Session):
    now = datetime.utcnow()
    overdue_loans = db.query(models.Loan).filter(
        models.Loan.status == "borrowed",
        models.Loan.due_date < now
    ).all()
    if overdue_loans:
        for loan in overdue_loans:
            loan.status = "overdue"
        db.commit()


def get_loans(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    member_id: Optional[int] = None,
    book_id: Optional[int] = None,
    status: Optional[str] = None
) -> List[models.Loan]:
    update_overdue_loans(db)
    query = db.query(models.Loan)
    if member_id:
        query = query.filter(models.Loan.member_id == member_id)
    if book_id:
        query = query.filter(models.Loan.book_id == book_id)
    if status and status != "All":
        query = query.filter(models.Loan.status == status)

    return query.order_by(models.Loan.borrow_date.desc()).offset(skip).limit(limit).all()


def get_loan_by_id(db: Session, loan_id: int) -> Optional[models.Loan]:
    update_overdue_loans(db)
    return db.query(models.Loan).filter(models.Loan.id == loan_id).first()


def create_loan(db: Session, loan_in: schemas.LoanCreate) -> models.Loan:
    book = get_book_by_id(db, loan_in.book_id)
    if not book:
        raise ValueError("Book not found")
    if book.available_quantity < 1:
        raise ValueError("Book is currently out of stock")

    member = get_member_by_id(db, loan_in.member_id)
    if not member:
        raise ValueError("Member not found")
    if not member.is_active:
        raise ValueError("Member account is inactive")

    existing_loan = db.query(models.Loan).filter(
        models.Loan.book_id == loan_in.book_id,
        models.Loan.member_id == loan_in.member_id,
        models.Loan.status.in_(["borrowed", "overdue"])
    ).first()
    if existing_loan:
        raise ValueError("This member already has an active loan for this book")

    book.available_quantity -= 1
    due_date = datetime.utcnow() + timedelta(days=loan_in.days)

    db_loan = models.Loan(
        book_id=loan_in.book_id,
        member_id=loan_in.member_id,
        borrow_date=datetime.utcnow(),
        due_date=due_date,
        status="borrowed"
    )

    db.add(db_loan)
    db.commit()
    db.refresh(db_loan)
    return db_loan


def return_loan(db: Session, loan_id: int) -> models.Loan:
    loan = get_loan_by_id(db, loan_id)
    if not loan:
        raise ValueError("Loan record not found")
    if loan.status == "returned":
        raise ValueError("This loan has already been returned")

    book = get_book_by_id(db, loan.book_id)
    if book:
        book.available_quantity = min(book.total_quantity, book.available_quantity + 1)

    loan.return_date = datetime.utcnow()
    loan.status = "returned"

    db.commit()
    db.refresh(loan)
    return loan


def get_library_stats(db: Session) -> schemas.LibraryStats:
    update_overdue_loans(db)

    total_books = db.query(func.count(models.Book.id)).scalar() or 0
    total_copies = db.query(func.sum(models.Book.total_quantity)).scalar() or 0
    available_copies = db.query(func.sum(models.Book.available_quantity)).scalar() or 0
    borrowed_copies = total_copies - available_copies

    total_members = db.query(func.count(models.Member.id)).scalar() or 0
    active_loans = db.query(func.count(models.Loan.id)).filter(models.Loan.status.in_(["borrowed", "overdue"])).scalar() or 0
    overdue_loans = db.query(func.count(models.Loan.id)).filter(models.Loan.status == "overdue").scalar() or 0

    return schemas.LibraryStats(
        total_books=total_books,
        total_copies=total_copies,
        available_copies=available_copies,
        borrowed_copies=max(0, borrowed_copies),
        total_members=total_members,
        active_loans=active_loans,
        overdue_loans=overdue_loans
    )
