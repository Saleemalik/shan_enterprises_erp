from django.contrib import admin
from .models import (
    ServiceBill,
    TransportDepotSection,
    TransportFOLSection,
    TransportFOLSlab,
    DestinationEntry,
)

# Register your models here.
admin.site.register(ServiceBill)
admin.site.register(TransportDepotSection)
admin.site.register(TransportFOLSection)
admin.site.register(TransportFOLSlab)
admin.site.register(DestinationEntry)