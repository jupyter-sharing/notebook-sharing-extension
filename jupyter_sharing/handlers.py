"""Sharing Extension API"""
import json
from typing import List

import tornado
from jupyter_server.base.handlers import APIHandler
from jupyter_server.extension.handler import ExtensionHandlerMixin
from tornado import web

from .client import PublishingServiceClient
from .models import JupyterContentsModel
from .models import PublishedFileIdentifier
from .models import PublishedFileMetadata


def request(model):
    def method_wrapper(method):
        # Needes to wrap a method, so adding one more layer
        # of depth to handle self.
        async def inner(self, *args, **kwargs):
            body = self.get_json_body()
            self.request_model: model = model.parse_obj(body)
            await method(self, *args, **kwargs)
            del self.request_model

        return inner

    return method_wrapper


def response(model):
    def method_wrapper(method):
        # Needs to wrap a method, so adding one more layer
        # of depth to handle self.
        async def inner(self, *args, **kwargs):
            await method(self, *args, **kwargs)
            assert isinstance(self.response_model, model)
            self.finish(self.response_model.json())
            del self.response_model

        return inner

    return method_wrapper


_file_id_regex = r"(?P<file_id>\w+-\w+-\w+-\w+-\w+)"


class BaseHandler(ExtensionHandlerMixin):
    @property
    def publishing_client(self) -> PublishingServiceClient:
        return self.settings["publishing_client"]

    @property
    def file_id_manager(self) -> PublishingServiceClient:
        return self.settings["file_id_manager"]


class PublishedFileHandler(BaseHandler, APIHandler):
    route = r"/publishing/%s" % _file_id_regex

    @web.authenticated
    @response(PublishedFileMetadata)
    async def get(self, file_id):
        model = PublishedFileIdentifier(id=file_id)
        self.response_model: PublishedFileMetadata = (
            await self.publishing_client.get_file(user=self.current_user, model=model)
        )

    @web.authenticated
    @request(PublishedFileMetadata)
    @response(PublishedFileMetadata)
    async def patch(self, file_id):
        """Update an existing file in the publishing service."""
        self.response_model: PublishedFileMetadata = (
            await self.publishing_client.update_file(
                user=self.current_user, model=self.request_model
            )
        )
        self.set_status(201)

    @web.authenticated
    async def delete(self, file_id):
        model = PublishedFileIdentifier(id=file_id)
        await self.publishing_client.remove_file(user=self.current_user, model=model)


class PublishingFileMetadataHandler(BaseHandler, APIHandler):
    route = r"/publishing/file"

    @web.authenticated
    async def get(self):
        path = self.get_argument("path", None)
        path = tornado.escape.url_unescape(path, plus=False)
        # Check if the file has been published before.
        file_id = self.file_id_manager.get_id(path)
        if file_id:
            model = PublishedFileIdentifier(id=str(file_id))
            try:
                response_model: PublishedFileMetadata = (
                    await self.publishing_client.get_file(
                        user=self.current_user, model=model, collaborators=False
                    )
                )
                self.finish(response_model.json())
            except:
                raise Exception("File not found.")
        # If no file ID was found, this document is not tracking
        # a shared file anymore.
        else:
            # No content found.
            self.set_status(204)


class PublishingHandler(BaseHandler, APIHandler):
    route = r"/publishing"

    @web.authenticated
    async def get(self) -> List[dict]:
        """Fetch the metadata for a file from the publishing service."""
        author = self.get_argument("author", "me")
        response = await self.publishing_client.get_files(
            user=self.current_user, author=author
        )
        self.finish(json.dumps(response))

    @web.authenticated
    @request(JupyterContentsModel)
    @response(PublishedFileMetadata)
    async def post(self):
        """Publish a new file to publishing service."""
        # If the file already exists, just update it.
        self.response_model: PublishedFileMetadata = (
            await self.publishing_client.publish_file(
                user=self.current_user, model=self.request_model
            )
        )
        self.set_status(201)


class DownloadHandler(BaseHandler, APIHandler):
    route = r"/publishing/%s/download" % _file_id_regex

    @web.authenticated
    @request(PublishedFileIdentifier)
    async def post(self, file_id):
        """Copy the contents of a published file to the notebook server."""
        await self.publishing_client.download_file(
            user=self.current_user, model=self.request_model
        )
        self.set_status(201)
        self.finish()


class PreviewHandler(BaseHandler, APIHandler):
    route = r"/publishing/%s/preview" % _file_id_regex

    @web.authenticated
    async def get(self, file_id):
        """Preview a published notebook in notebook server."""
        view = self.get_argument("view", "full")
        model = PublishedFileIdentifier(id=file_id)
        obj: dict = await self.publishing_client.preview_file(
            user=self.current_user, model=model, view=view
        )
        self.finish(json.dumps(obj))


class SearchCollaboratorsHandler(BaseHandler, APIHandler):
    route = r"/publishing/search/users"

    @web.authenticated
    async def get(self):
        search_string = self.get_argument("search_string", None)
        if not search_string:
            return self.finish(json.dumps([]))
        search_string = tornado.escape.url_escape(search_string, plus=False)
        collaborators = await self.publishing_client.search_collaborators(
            user=self.current_user, search_string=search_string
        )
        self.finish(json.dumps(collaborators))


_handlers = [
    SearchCollaboratorsHandler,
    PublishedFileHandler,
    PublishingFileMetadataHandler,
    PreviewHandler,
    DownloadHandler,
    PublishingHandler,
]
handlers = [(h.route, h) for h in _handlers]
