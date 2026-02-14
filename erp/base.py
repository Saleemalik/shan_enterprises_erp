# base.py
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .mixins import SoftDeleteMixin, BulkDeleteMixin
from django_filters.rest_framework import DjangoFilterBackend

#  ModelViewSet with common features for the ERP application
class BaseViewSet(viewsets.ModelViewSet):
    """
    Base class for all ERP ViewSets.
    Includes:
     - Search / Ordering
     - Login required
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]

class AppBaseViewSet(SoftDeleteMixin, BulkDeleteMixin, BaseViewSet):
    """
    Base class for all ERP ViewSets with soft delete and bulk delete features.
    Inherits from BaseViewSet.
    """
    pass