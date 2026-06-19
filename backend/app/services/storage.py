import shutil
import uuid
from pathlib import Path

import boto3
from fastapi import UploadFile

from app.config import settings


class StorageService:
    def __init__(self) -> None:
        self.backend = settings.storage_backend.lower()
        self.s3 = None
        if self.backend == "s3":
            self.s3 = boto3.client(
                "s3",
                region_name=settings.aws_region,
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
            )

    def save(self, file: UploadFile, user_id: str, claim_id: str) -> tuple[str, str]:
        suffix = Path(file.filename or "upload.jpg").suffix.lower() or ".jpg"
        key = f"claims/{user_id}/{claim_id}/{uuid.uuid4()}{suffix}"

        if self.backend == "s3":
            if not self.s3 or not settings.s3_bucket:
                raise RuntimeError("S3 storage is selected but S3_BUCKET is not configured")
            self.s3.upload_fileobj(
                file.file,
                settings.s3_bucket,
                key,
                ExtraArgs={"ContentType": file.content_type or "application/octet-stream"},
            )
            url = f"https://{settings.s3_bucket}.s3.{settings.aws_region}.amazonaws.com/{key}"
            return key, url

        destination = settings.upload_path / key
        destination.parent.mkdir(parents=True, exist_ok=True)
        with destination.open("wb") as output:
            shutil.copyfileobj(file.file, output)
        return key, f"/uploads/{key}"

    def local_path(self, storage_key: str) -> Path | None:
        if self.backend != "local":
            return None
        return settings.upload_path / storage_key


storage_service = StorageService()

