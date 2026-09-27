from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from api.database import get_db
from api import schemas, crud

router = APIRouter(prefix="/api/books", tags=["Books"])


@router.get("", response_model=List[schemas.BookOut])
def list_books(
    search: Optional[str] = Query(None, description="Search by title, author, or ISBN"),
    genre: Optional[str] = Query(None, description="Filter by genre"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    return crud.get_books(db=db, skip=skip, limit=limit, search=search, genre=genre)


@router.get("/{book_id}", response_model=schemas.BookOut)
def get_book(book_id: int, db: Session = Depends(get_db)):
    book = crud.get_book_by_id(db=db, book_id=book_id)
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    return book


@router.post("", response_model=schemas.BookOut, status_code=status.HTTP_201_CREATED)
def create_book(book: schemas.BookCreate, db: Session = Depends(get_db)):
    existing = crud.get_book_by_isbn(db=db, isbn=book.isbn.strip())
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Book with ISBN '{book.isbn}' already exists."
        )
    return crud.create_book(db=db, book=book)


@router.put("/{book_id}", response_model=schemas.BookOut)
def update_book(book_id: int, book_update: schemas.BookUpdate, db: Session = Depends(get_db)):
    if book_update.isbn:
        existing = crud.get_book_by_isbn(db=db, isbn=book_update.isbn.strip())
        if existing and existing.id != book_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"ISBN '{book_update.isbn}' is already used by another book."
            )

    updated = crud.update_book(db=db, book_id=book_id, book_update=book_update)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    return updated


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(book_id: int, db: Session = Depends(get_db)):
    success = crud.delete_book(db=db, book_id=book_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    return None
