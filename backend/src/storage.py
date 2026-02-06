"""
File storage abstraction layer.
Supports local filesystem and AWS S3 storage backends.
Designed for flexibility - can switch storage backend via configuration.
"""
import os
import uuid
import hashlib
import mimetypes
from abc import ABC, abstractmethod
from datetime import datetime
from pathlib import Path
from typing import BinaryIO, Optional, Tuple
from dataclasses import dataclass

from src.exceptions import StorageError, FileTooLargeError, InvalidFileTypeError


@dataclass
class StoredFile:
    """Information about a stored file."""
    key: str  # Unique identifier/path in storage
    original_filename: str
    content_type: str
    size: int  # bytes
    checksum: str  # MD5 hash
    storage_backend: str  # 'local' or 's3'
    url: Optional[str] = None  # Public URL if available


@dataclass
class StorageConfig:
    """Storage configuration."""
    # General settings
    max_file_size_mb: int = 50  # Maximum file size in MB
    allowed_extensions: Tuple[str, ...] = (
        # Documents
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.txt', '.rtf', '.odt', '.ods', '.odp',
        # Images
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp',
        # Archives
        '.zip', '.rar', '.7z', '.tar', '.gz',
        # Other
        '.mp3', '.mp4', '.avi', '.mov', '.mkv',
    )
    
    # Local storage settings
    local_storage_path: str = "uploads"
    
    # S3 settings (set via environment variables)
    s3_bucket: Optional[str] = None
    s3_region: Optional[str] = None
    s3_access_key: Optional[str] = None
    s3_secret_key: Optional[str] = None
    s3_endpoint_url: Optional[str] = None  # For S3-compatible services (MinIO, etc.)
    
    @classmethod
    def from_env(cls) -> "StorageConfig":
        """Load configuration from environment variables."""
        return cls(
            max_file_size_mb=int(os.getenv("MAX_FILE_SIZE_MB", "50")),
            local_storage_path=os.getenv("LOCAL_STORAGE_PATH", "uploads"),
            s3_bucket=os.getenv("AWS_S3_BUCKET"),
            s3_region=os.getenv("AWS_REGION", "us-east-1"),
            s3_access_key=os.getenv("AWS_ACCESS_KEY_ID"),
            s3_secret_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            s3_endpoint_url=os.getenv("AWS_S3_ENDPOINT_URL"),
        )
    
    @property
    def use_s3(self) -> bool:
        """Check if S3 storage should be used."""
        return bool(self.s3_bucket and self.s3_access_key and self.s3_secret_key)


class StorageBackend(ABC):
    """Abstract base class for storage backends."""
    
    def __init__(self, config: StorageConfig):
        self.config = config
    
    @abstractmethod
    async def save(
        self,
        file: BinaryIO,
        filename: str,
        content_type: Optional[str] = None,
        folder: str = "",
    ) -> StoredFile:
        """Save a file and return storage information."""
        pass
    
    @abstractmethod
    async def get(self, key: str) -> Tuple[BinaryIO, str]:
        """Get a file by key. Returns (file_object, content_type)."""
        pass
    
    @abstractmethod
    async def delete(self, key: str) -> bool:
        """Delete a file by key. Returns True if deleted."""
        pass
    
    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Check if a file exists."""
        pass
    
    @abstractmethod
    def get_url(self, key: str, expires_in: int = 3600) -> Optional[str]:
        """Get a URL for accessing the file (may be signed/temporary for S3)."""
        pass
    
    def validate_file(self, filename: str, size: int) -> None:
        """Validate file before saving."""
        # Check file size
        max_size_bytes = self.config.max_file_size_mb * 1024 * 1024
        if size > max_size_bytes:
            raise FileTooLargeError(
                max_size_mb=self.config.max_file_size_mb,
                actual_size_mb=size / (1024 * 1024)
            )
        
        # Check file extension
        ext = Path(filename).suffix.lower()
        if ext not in self.config.allowed_extensions:
            raise InvalidFileTypeError(
                file_type=ext,
                allowed_types=list(self.config.allowed_extensions)
            )
    
    def generate_key(self, filename: str, folder: str = "") -> str:
        """Generate a unique storage key for a file."""
        # Create unique filename with UUID prefix
        ext = Path(filename).suffix.lower()
        unique_id = uuid.uuid4().hex[:12]
        timestamp = datetime.now().strftime("%Y%m%d")
        safe_filename = f"{timestamp}_{unique_id}{ext}"
        
        if folder:
            return f"{folder.strip('/')}/{safe_filename}"
        return safe_filename
    
    def calculate_checksum(self, file: BinaryIO) -> str:
        """Calculate MD5 checksum of a file."""
        md5 = hashlib.md5()
        file.seek(0)
        for chunk in iter(lambda: file.read(8192), b""):
            md5.update(chunk)
        file.seek(0)
        return md5.hexdigest()


class LocalStorageBackend(StorageBackend):
    """Local filesystem storage backend."""
    
    def __init__(self, config: StorageConfig):
        super().__init__(config)
        self.base_path = Path(config.local_storage_path)
        # Create base directory if it doesn't exist
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    async def save(
        self,
        file: BinaryIO,
        filename: str,
        content_type: Optional[str] = None,
        folder: str = "",
    ) -> StoredFile:
        """Save file to local filesystem."""
        # Read file content to get size
        file.seek(0, 2)  # Seek to end
        size = file.tell()
        file.seek(0)  # Reset to beginning
        
        # Validate
        self.validate_file(filename, size)
        
        # Generate unique key
        key = self.generate_key(filename, folder)
        
        # Create folder structure if needed
        file_path = self.base_path / key
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Calculate checksum
        checksum = self.calculate_checksum(file)
        
        # Determine content type
        if not content_type:
            content_type, _ = mimetypes.guess_type(filename)
            content_type = content_type or "application/octet-stream"
        
        try:
            # Save file
            with open(file_path, "wb") as f:
                file.seek(0)
                for chunk in iter(lambda: file.read(8192), b""):
                    f.write(chunk)
        except Exception as e:
            raise StorageError("save", str(e))
        
        return StoredFile(
            key=key,
            original_filename=filename,
            content_type=content_type,
            size=size,
            checksum=checksum,
            storage_backend="local",
            url=f"/files/{key}",
        )
    
    async def get(self, key: str) -> Tuple[BinaryIO, str]:
        """Get file from local filesystem."""
        file_path = self.base_path / key
        
        if not file_path.exists():
            raise StorageError("get", f"File not found: {key}")
        
        content_type, _ = mimetypes.guess_type(str(file_path))
        content_type = content_type or "application/octet-stream"
        
        return open(file_path, "rb"), content_type
    
    async def delete(self, key: str) -> bool:
        """Delete file from local filesystem."""
        file_path = self.base_path / key
        
        if not file_path.exists():
            return False
        
        try:
            file_path.unlink()
            # Clean up empty parent directories
            parent = file_path.parent
            while parent != self.base_path and not any(parent.iterdir()):
                parent.rmdir()
                parent = parent.parent
            return True
        except Exception as e:
            raise StorageError("delete", str(e))
    
    async def exists(self, key: str) -> bool:
        """Check if file exists in local filesystem."""
        return (self.base_path / key).exists()
    
    def get_url(self, key: str, expires_in: int = 3600) -> Optional[str]:
        """Get URL for local file."""
        return f"/api/files/{key}"


class S3StorageBackend(StorageBackend):
    """AWS S3 (and S3-compatible) storage backend."""
    
    def __init__(self, config: StorageConfig):
        super().__init__(config)
        self._client = None
    
    @property
    def client(self):
        """Lazy-load boto3 client."""
        if self._client is None:
            try:
                import boto3
                from botocore.config import Config as BotoConfig
            except ImportError:
                raise StorageError(
                    "init",
                    "boto3 is required for S3 storage. Install with: pip install boto3"
                )
            
            boto_config = BotoConfig(
                signature_version='s3v4',
                retries={'max_attempts': 3, 'mode': 'standard'}
            )
            
            client_kwargs = {
                "service_name": "s3",
                "region_name": self.config.s3_region,
                "aws_access_key_id": self.config.s3_access_key,
                "aws_secret_access_key": self.config.s3_secret_key,
                "config": boto_config,
            }
            
            if self.config.s3_endpoint_url:
                client_kwargs["endpoint_url"] = self.config.s3_endpoint_url
            
            self._client = boto3.client(**client_kwargs)
        
        return self._client
    
    async def save(
        self,
        file: BinaryIO,
        filename: str,
        content_type: Optional[str] = None,
        folder: str = "",
    ) -> StoredFile:
        """Save file to S3."""
        # Read file content to get size
        file.seek(0, 2)
        size = file.tell()
        file.seek(0)
        
        # Validate
        self.validate_file(filename, size)
        
        # Generate unique key
        key = self.generate_key(filename, folder)
        
        # Calculate checksum
        checksum = self.calculate_checksum(file)
        
        # Determine content type
        if not content_type:
            content_type, _ = mimetypes.guess_type(filename)
            content_type = content_type or "application/octet-stream"
        
        try:
            file.seek(0)
            self.client.upload_fileobj(
                file,
                self.config.s3_bucket,
                key,
                ExtraArgs={
                    "ContentType": content_type,
                    "Metadata": {
                        "original-filename": filename,
                        "checksum": checksum,
                    }
                }
            )
        except Exception as e:
            raise StorageError("save", str(e))
        
        return StoredFile(
            key=key,
            original_filename=filename,
            content_type=content_type,
            size=size,
            checksum=checksum,
            storage_backend="s3",
            url=self.get_url(key),
        )
    
    async def get(self, key: str) -> Tuple[BinaryIO, str]:
        """Get file from S3."""
        import io
        
        try:
            response = self.client.get_object(
                Bucket=self.config.s3_bucket,
                Key=key
            )
            content_type = response.get("ContentType", "application/octet-stream")
            body = io.BytesIO(response["Body"].read())
            return body, content_type
        except Exception as e:
            raise StorageError("get", str(e))
    
    async def delete(self, key: str) -> bool:
        """Delete file from S3."""
        try:
            self.client.delete_object(
                Bucket=self.config.s3_bucket,
                Key=key
            )
            return True
        except Exception as e:
            raise StorageError("delete", str(e))
    
    async def exists(self, key: str) -> bool:
        """Check if file exists in S3."""
        try:
            self.client.head_object(
                Bucket=self.config.s3_bucket,
                Key=key
            )
            return True
        except:
            return False
    
    def get_url(self, key: str, expires_in: int = 3600) -> Optional[str]:
        """Get pre-signed URL for S3 file."""
        try:
            url = self.client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self.config.s3_bucket,
                    "Key": key
                },
                ExpiresIn=expires_in
            )
            return url
        except Exception:
            return None


class Storage:
    """
    Main storage interface.
    Automatically selects backend based on configuration.
    
    Usage:
        storage = Storage()
        
        # Save a file
        stored = await storage.save(file_obj, "document.pdf", folder="assignments")
        
        # Get file URL
        url = storage.get_url(stored.key)
        
        # Delete file
        await storage.delete(stored.key)
    """
    
    _instance: Optional["Storage"] = None
    
    def __init__(self, config: Optional[StorageConfig] = None):
        self.config = config or StorageConfig.from_env()
        
        if self.config.use_s3:
            self.backend = S3StorageBackend(self.config)
        else:
            self.backend = LocalStorageBackend(self.config)
    
    @classmethod
    def get_instance(cls) -> "Storage":
        """Get singleton instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    async def save(
        self,
        file: BinaryIO,
        filename: str,
        content_type: Optional[str] = None,
        folder: str = "",
    ) -> StoredFile:
        """Save a file."""
        return await self.backend.save(file, filename, content_type, folder)
    
    async def get(self, key: str) -> Tuple[BinaryIO, str]:
        """Get a file."""
        return await self.backend.get(key)
    
    async def delete(self, key: str) -> bool:
        """Delete a file."""
        return await self.backend.delete(key)
    
    async def exists(self, key: str) -> bool:
        """Check if file exists."""
        return await self.backend.exists(key)
    
    def get_url(self, key: str, expires_in: int = 3600) -> Optional[str]:
        """Get file URL."""
        return self.backend.get_url(key, expires_in)
    
    @property
    def backend_type(self) -> str:
        """Get current storage backend type."""
        return "s3" if self.config.use_s3 else "local"


# Dependency for FastAPI
def get_storage() -> Storage:
    """FastAPI dependency for getting storage instance."""
    return Storage.get_instance()
