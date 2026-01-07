import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "shan_enterprises.settings"
)

from django.core.management import execute_from_command_line

execute_from_command_line([
    "manage.py",
    "runserver",
    "127.0.0.1:8000",
    "--noreload"
])
