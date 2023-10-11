import datetime
from typing import List
from typing import Optional

from pydantic import AnyUrl
from pydantic import BaseModel
from pydantic import root_validator
from pydantic import validator


class User(BaseModel):
    id: str
    name: str
    email: str


class JupyterContentsModel(BaseModel):
    name: str
    path: str
    type: str
    created: str
    last_modified: str
    writable: Optional[bool] = None
    mimetype: Optional[str] = None
    content: Optional[dict] = None
    format: Optional[str] = None
    chunk: Optional[int] = None
    fileType: str

    @validator("created", "last_modified", pre=True)
    def coerce_date(cls, v):
        """Ensure that dates are converted to strings."""
        if isinstance(v, datetime.datetime):
            return v.isoformat()
        return v

    @root_validator(pre=True)
    def match_filetype(cls, values):
        """Ensure that fileType and file are equal."""
        ftype = values.get("type", None)
        fileType = values.get("fileType", ftype)
        values["type"] = fileType
        values["fileType"] = fileType
        return values


class Collaborator(BaseModel):
    user: User
    permissions: Optional[list] = None


class PublishedFileMetadata(BaseModel):
    id: str
    author: str
    shareable_link: Optional[str]
    title: Optional[str]
    created: Optional[str]
    last_modified: Optional[str]
    version: Optional[str]
    permissions: Optional[list] = None
    collaborators: Optional[List[User]] = None
    contents: Optional[JupyterContentsModel] = None


class CreateSharedFileModel(BaseModel):
    id: str
    author: str
    title: Optional[str]
    collaborators: Optional[List[User]] = None
    contents: JupyterContentsModel


class PatchSharedFileModel(BaseModel):
    id: str
    author: str
    title: Optional[str]
    collaborators: Optional[List[User]] = None
    contents: Optional[JupyterContentsModel] = None


class PublishedFileIdentifier(BaseModel):
    id: Optional[str]
    path: Optional[str]
    shareable_link: Optional[AnyUrl]
