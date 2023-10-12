from jupyter_server.extension.application import ExtensionApp
from traitlets import Type
from traitlets import Unicode

from .client import PublishingServiceClient
from .handlers import handlers
from .traits import UnicodeFromEnv


class JupyterSharingExtension(ExtensionApp):
    name = "jupyter_sharing"
    handlers = handlers
    publishing_url = Unicode(
        allow_none=True,
    ).tag(config=True)

    publishing_client_class = Type(
        default=PublishingServiceClient, klass=PublishingServiceClient
    ).tag(config=True)

    def initialize_settings(self):
        file_id_manager = self.settings.get("file_id_manager")
        publishing_client = self.publishing_client_class(
            parent=self,
            file_id_manager=file_id_manager,
            publishing_service_url=self.publishing_url,
        )
        # Set some JupyterLab page config for this extension—useful
        # for passing settings to the JupyterLab client.
        page_config = self.serverapp.web_app.settings.setdefault("page_config_data", {})
        page_config["publishingURL"] = self.publishing_url
        # Hand the publishing client to all handlers.
        self.settings.update(
            {
                "publishing_client": publishing_client
            }  # , "page_config_data": page_config}
        )
