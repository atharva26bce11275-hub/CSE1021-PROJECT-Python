from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from api.database import get_db
from api import schemas, crud, models

router = APIRouter(prefix="/api/members", tags=["Members"])


@router.get("", response_model=List[schemas.MemberOut])
def list_members(
    search: Optional[str] = Query(None, description="Search by name, email, or code"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    members = crud.get_members(db=db, skip=skip, limit=limit, search=search)
    out_members = []
    for m in members:
        active_loans_count = db.query(models.Loan).filter(
            models.Loan.member_id == m.id,
            models.Loan.status.in_(["borrowed", "overdue"])
        ).count()
        member_dict = schemas.MemberOut.model_validate(m).model_dump()
        member_dict["active_loans_count"] = active_loans_count
        out_members.append(schemas.MemberOut(**member_dict))
    return out_members


@router.get("/{member_id}", response_model=schemas.MemberOut)
def get_member(member_id: int, db: Session = Depends(get_db)):
    member = crud.get_member_by_id(db=db, member_id=member_id)
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    
    active_loans_count = db.query(models.Loan).filter(
        models.Loan.member_id == member.id,
        models.Loan.status.in_(["borrowed", "overdue"])
    ).count()
    member_dict = schemas.MemberOut.model_validate(member).model_dump()
    member_dict["active_loans_count"] = active_loans_count
    return schemas.MemberOut(**member_dict)


@router.post("", response_model=schemas.MemberOut, status_code=status.HTTP_201_CREATED)
def register_member(member: schemas.MemberCreate, db: Session = Depends(get_db)):
    if crud.get_member_by_email(db=db, email=member.email.lower().strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Member with email '{member.email}' already exists."
        )
    if crud.get_member_by_code(db=db, code=member.membership_code.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Membership code '{member.membership_code}' is already assigned."
        )

    db_member = crud.create_member(db=db, member=member)
    member_dict = schemas.MemberOut.model_validate(db_member).model_dump()
    member_dict["active_loans_count"] = 0
    return schemas.MemberOut(**member_dict)


@router.put("/{member_id}", response_model=schemas.MemberOut)
def update_member(member_id: int, member_update: schemas.MemberUpdate, db: Session = Depends(get_db)):
    if member_update.email:
        existing = crud.get_member_by_email(db=db, email=member_update.email.lower().strip())
        if existing and existing.id != member_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{member_update.email}' is already used by another member."
            )
    if member_update.membership_code:
        existing = crud.get_member_by_code(db=db, code=member_update.membership_code.strip())
        if existing and existing.id != member_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Membership code '{member_update.membership_code}' is already used."
            )

    updated = crud.update_member(db=db, member_id=member_id, member_update=member_update)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    
    active_loans_count = db.query(models.Loan).filter(
        models.Loan.member_id == updated.id,
        models.Loan.status.in_(["borrowed", "overdue"])
    ).count()
    member_dict = schemas.MemberOut.model_validate(updated).model_dump()
    member_dict["active_loans_count"] = active_loans_count
    return schemas.MemberOut(**member_dict)


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member(member_id: int, db: Session = Depends(get_db)):
    success = crud.delete_member(db=db, member_id=member_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    return None
