# mixins.py
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

class SoftDeleteMixin:
    """
    Soft delete — mark multiple records as deleted using ids param
    we will use is_deleted field for soft delete
    later uses it.
    """

    @action(detail=False, methods=["delete"])
    def soft_delete(self, request):
        """Soft delete multiple records using ids param"""
        ids = request.query_params.get("ids", "")
        ids_list = ids.split(",")

        # UPDATE: Mark the records as deleted (model should have is_deleted field)
        self.get_queryset().filter(id__in=ids_list).update(is_deleted=True)

        return Response(
            {"soft_deleted": ids_list},
            status=status.HTTP_200_OK
        )


class BulkDeleteMixin:
    """
    Hard delete — permanently remove multiple records using ids param
    """

    @action(detail=False, methods=["delete"])
    def bulk_delete(self, request):
        ids = request.query_params.get("ids", "")
        ids_list = ids.split(",")

        self.get_queryset().filter(id__in=ids_list).delete()

        return Response(
            {"deleted": ids_list},
            status=status.HTTP_200_OK
        )
