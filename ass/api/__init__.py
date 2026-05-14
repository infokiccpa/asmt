from fastapi import APIRouter
from .upload import router as upload_router
from .proctor import router as proctor_router

router = APIRouter()
router.include_router(upload_router, tags=["upload"])
router.include_router(proctor_router, prefix="/proctor", tags=["proctor"])
