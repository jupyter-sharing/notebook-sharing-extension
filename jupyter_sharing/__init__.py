from ._version import __version__
from .extension import JupyterSharingExtension


def _jupyter_labextension_paths():
    return [{"src": "labextension", "dest": "jupyter_sharing"}]


def _jupyter_server_extension_points():
    return [{"module": "jupyter_sharing", "app": JupyterSharingExtension}]
