"""
Unified Logger for Base App Backend

@fileoverview Provides a configured logger instance with the DSC: prefix
for all backend logging. All modules must use this logger instead of
print() or direct logging calls.

@author David Seguin
@version 1.0.0
@since 2026
@license Professional - All Rights Reserved

Key Features:
- Consistent DSC: prefix on all log messages
- Structured log format with timestamp, level, and message
- Console output with color-coded levels
- Configurable log level via environment variable

Dependencies:
- Python standard library logging module

Security Considerations:
- Never log sensitive data (tokens, passwords, secrets)
- Sanitize user input before logging

Performance Notes:
- Minimal overhead; standard library logging
"""

import logging
import os


class _RequestIdFilter(logging.Filter):
    """Inject g.request_id (or '-') into every log record."""

    def filter(self, record):  # noqa: A003 - logging API
        request_id = '-'
        try:
            from flask import g, has_request_context
            if has_request_context():
                request_id = getattr(g, 'request_id', '-') or '-'
        except Exception:
            pass
        record.request_id = request_id
        return True


LOG_LEVEL = os.environ.get('LOG_LEVEL', 'DEBUG').upper()

formatter = logging.Formatter(
    fmt='DSC: [%(levelname)s] %(asctime)s [%(request_id)s] - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

handler = logging.StreamHandler()
handler.setFormatter(formatter)
handler.addFilter(_RequestIdFilter())

logger = logging.getLogger('base-app')
logger.setLevel(getattr(logging, LOG_LEVEL, logging.DEBUG))
logger.addHandler(handler)
logger.propagate = False
