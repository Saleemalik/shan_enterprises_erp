from django.db.models import Max
from .views import Dealer

import uuid
import hashlib

def generate_dealer_code():
    prefix = "GAR"
    last_code = Dealer.objects.filter(code__startswith=prefix).aggregate(
        max_code=Max("code")
    )["max_code"]

    if not last_code:
        return f"{prefix}001"

    last_number = int(last_code.replace(prefix, ""))
    new_number = last_number + 1
    return f"{prefix}{new_number:03d}"


def fmt_km(val):
    if val is None:
        return ""
    return str(int(val)) if val.is_integer() else str(val)



def get_machine_id():
    raw = str(uuid.getnode())
    return hashlib.sha256(raw.encode()).hexdigest()
