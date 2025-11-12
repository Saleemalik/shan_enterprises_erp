# base.py
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .mixins import SoftDeleteMixin, BulkDeleteMixin

class AppBaseViewSet(SoftDeleteMixin, BulkDeleteMixin, viewsets.ModelViewSet):
    """
    Base class for all ERP ViewSets.
    Includes:
     - Soft delete
     - Bulk delete
     - Search / Ordering
     - Login required
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
