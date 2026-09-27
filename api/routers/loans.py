from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from api.database import get_db
from api import schemas, crud

router = APIRouter(tags=["Loans & Operations"])


@router.get("/api/loans", response_model=List[schemas.LoanOut])
def list_loans(
    member_id: Optional[int] = Query(None),
    book_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    return crud.get_loans(
        db=db,
        skip=skip,
        limit=limit,
        member_id=member_id,
        book_id=book_id,
        status=status_filter
    )


@router.post("/api/loans/borrow", response_model=schemas.LoanOut, status_code=status.HTTP_201_CREATED)
def borrow_book(loan_in: schemas.LoanCreate, db: Session = Depends(get_db)):
    try:
        loan = crud.create_loan(db=db, loan_in=loan_in)
        return loan
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/api/loans/return/{loan_id}", response_model=schemas.LoanOut)
def return_book(loan_id: int, db: Session = Depends(get_db)):
    try:
        loan = crud.return_loan(db=db, loan_id=loan_id)
        return loan
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/api/stats", response_model=schemas.LibraryStats)
def get_stats(db: Session = Depends(get_db)):
    return crud.get_library_stats(db=db)
