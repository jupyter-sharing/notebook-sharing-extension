import abc
import json
import os
import ssl
from typing import List
from typing import Optional

from jupyter_core.paths import jupyter_runtime_dir
from jupyter_server.services.contents.manager import ContentsManager
from jupyter_server.utils import url_path_join as ujoin
from pydantic import AnyUrl
from tornado.httpclient import AsyncHTTPClient
from tornado.httpclient import HTTPRequest
from tornado.httpclient import HTTPResponse
from traitlets import default
from traitlets import Instance
from traitlets import Unicode
from traitlets.config import LoggingConfigurable

from .models import CreateSharedFileModel
from .models import JupyterContentsModel
from .models import PatchSharedFileModel
from .models import PublishedFileIdentifier
from .models import PublishedFileMetadata
from jupyter_server.auth.identity import User
from .traits import IntFromEnv


PUBLISHING_CACHE_PATH = os.path.join(jupyter_runtime_dir(), "publishing")


class PublishedFileNotFound(Exception):
    pass


class PublishedFileAlreadyExists(Exception):
    pass


class PublishedFileAuthorNotKnown(Exception):
    pass


class PublishingServiceClientABC(abc.ABC):
    @abc.abstractmethod
    async def get_file_content(self, file_id: str) -> JupyterContentsModel:
        ...

    @abc.abstractmethod
    async def get_file(
        self, user: User, model: PublishedFileIdentifier
    ) -> PublishedFileMetadata:
        ...

    @abc.abstractmethod
    async def get_files(
        self, user: User, model: PublishedFileIdentifier
    ) -> PublishedFileMetadata:
        ...

    @abc.abstractmethod
    async def download_file(self, user: User, model: PublishedFileIdentifier) -> None:
        ...

    @abc.abstractmethod
    async def publish_file(
        self, user: User, model: JupyterContentsModel
    ) -> PublishedFileMetadata:
        ...

    @abc.abstractmethod
    async def update_file(
        self, user: User, model: PublishedFileMetadata
    ) -> PublishedFileMetadata:
        ...

    @abc.abstractmethod
    async def remove_file(self, user: User, model: PublishedFileIdentifier) -> None:
        ...

    @abc.abstractmethod
    async def preview_file(self, user: User, model: PublishedFileIdentifier) -> str:
        ...


class PublishingServiceClient(LoggingConfigurable):
    """A Client class for talking to the Sharing Service."""

    contents_manager = Instance(ContentsManager)
    publishing_service_url = Unicode().tag(config=True)
    http_client = Instance(AsyncHTTPClient).tag(config=True)

    request_timeout = IntFromEnv(name=10, default_value=120, allow_none=True).tag(
        config=True
    )

    # Explicitly set a token for all requests to the publishing service.
    # Otherwise, the user model's JWT will be used.
    api_token = Unicode(allow_none=True).tag(config=True)

    @default("http_client")
    def _default_http_client(self):  # pragma: no cover
        return AsyncHTTPClient()

    def get_headers(self, token: Optional[str] = None, trace_id=None):
        """Get the headers needed for a request"""
        if not token:
            token = self.api_token
        headers = {
            "Authorization": "Bearer %s" % token,
            "Content-Type": "application/json;charset=UTF-8",
        }
        return headers

    @property
    def cm(self) -> ContentsManager:
        return self.contents_manager

    def get_id_from_link(self, link: AnyUrl) -> str:
        file_id = link.path.split("/")[-1]
        return file_id

    def get_id_from_path(self, path: str) -> str:
        file_id = self.contents_manager.file_id_manager.index(path)
        return file_id

    def _get_request(self, *, url: str, method: str, data: dict, headers: dict):
        """Build a Tornado request object for Sharing Service API."""
        return HTTPRequest(
            url=url,
            method=method.upper(),
            headers=headers,
            body=json.dumps(data),
            allow_nonstandard_methods=True,
            validate_cert=False,
            request_timeout=float(self.request_timeout),
        )

    async def _request(
        self, user: User, *parts, method="GET", data=None
    ) -> HTTPResponse:
        """Make a request to the Sharing Service."""
        url = ujoin(self.publishing_service_url, *parts)
        self.log.debug(f"Making {method.upper()} request against {url}")
        try:
            request = self._get_request(
                url=url, method=method, data=data, headers=self.get_headers(user)
            )
            response = await self.http_client.fetch(request)
        except ssl.SSLCertVerificationError or ssl.SSLError:  # pragma: no cover
            # Refresh SSL Cert.
            request = self._get_request(
                url=url, method=method, data=data, headers=self.get_headers(user)
            )
            response = await self.http_client.fetch(request)
        return response

    async def get_file_content(
        self, user, model: PublishedFileIdentifier
    ) -> JupyterContentsModel:
        response = await self._request(
            user, f"/sharing/{model.id}?content=true", method="GET"
        )
        obj = json.loads(response.body)
        metadata: PublishedFileMetadata = PublishedFileMetadata.parse_obj(obj)
        return metadata.contents

    async def get_file(
        self, user: User, model: PublishedFileIdentifier, collaborators=True
    ) -> PublishedFileMetadata:
        url = f"/sharing/{model.id}"
        if not collaborators:
            url += "?collaborators=False"
        response = await self._request(user, url)
        obj = json.loads(response.body)
        model = PublishedFileMetadata.parse_obj(obj)
        return model

    async def get_files(self, user: User, author="me"):
        """Get a list of all files published by the given author."""
        response = await self._request(user, f"/sharing?author={author}")
        obj = json.loads(response.body)
        return obj["files"]

    async def publish_file(
        self, user: User, model: JupyterContentsModel
    ) -> PublishedFileMetadata:
        path = model.path
        file_id = self.contents_manager.file_id_manager.index(path)
        # NOTE: Convert UUID to a string here. We should watch this to make
        # sure this doesn't cause issues for mapping back.
        create_model = CreateSharedFileModel(
            id=str(file_id),
            author=user.email,
            title=model.name,
            contents=model,
            notebook_server=self.notebook_id,
        )
        response = await self._request(
            user, "/sharing", method="POST", data=create_model.dict()
        )
        obj = json.loads(response.body)
        model = PublishedFileMetadata.parse_obj(obj)
        return model

    async def update_file(
        self, user: User, model: PatchSharedFileModel
    ) -> PublishedFileMetadata:
        model.notebook_server = self.notebook_id
        response = await self._request(
            user, f"/sharing/{model.id}", method="PATCH", data=model.dict()
        )
        obj = json.loads(response.body)
        model = PublishedFileMetadata.parse_obj(obj)
        return model

    async def remove_file(self, user: User, model: PublishedFileIdentifier) -> None:
        response = await self._request(user, f"/sharing/{model.id}", method="DELETE")
        return response

    async def preview_file(
        self, user: User, model: PublishedFileIdentifier, view="full"
    ) -> dict:
        response = await self._request(user, f"/sharing/{model.id}/preview?view={view}")
        obj: dict = json.loads(response.body)
        return obj

    async def download_file(self, user: User, model: PublishedFileIdentifier) -> None:
        """Download a file from the Sharing Service to this Jupyter Server."""
        contents: JupyterContentsModel = await self.get_file_content(
            user=user, model=model
        )
        self.contents_manager.save(contents.dict(), model.path)

    async def search_collaborators(self, user: User, search_string: str) -> List[dict]:
        response = await self._request(
            user, f"/search/users?search_string={search_string}"
        )
        obj = json.loads(response.body)
        return obj


PublishingServiceClientABC.register(PublishingServiceClient)
