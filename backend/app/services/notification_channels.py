import logging
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class ChannelPreview:
    channel: str
    label: str
    to: str
    message: str


class InAppNotificationChannel:
    """Persistence is the in-app channel; no external delivery."""

    channel_name = "in_app"


class WhatsAppDemoChannel:
    """Demo-only preview — never sends real messages."""

    channel_name = "whatsapp_demo"
    demo_label = "Demo Channel — message preview only"

    @staticmethod
    def build_preview(to_label: str, title: str, message: str) -> ChannelPreview:
        body = (
            f"Family Food Firewall:\n{title}\n{message}\n"
            "Open the app to review purchase findings and product details."
        )
        logger.info("[WhatsApp Demo] To: %s\nMessage:\n%s", to_label, body)
        return ChannelPreview(
            channel="whatsapp_demo",
            label=WhatsAppDemoChannel.demo_label,
            to=to_label,
            message=body,
        )
