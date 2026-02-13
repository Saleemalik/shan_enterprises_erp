from django.urls import path
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from .views import DealerViewSet, PlaceViewSet, DestinationViewSet, RateRangeViewSet, DestinationEntryViewSet, ServiceBillViewSet, TransportItemViewSet
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


router = routers.DefaultRouter()
router.register(r'dealers', DealerViewSet)
router.register(r'places', PlaceViewSet)
router.register(r'rate-ranges', RateRangeViewSet)
router.register(r'destinations', DestinationViewSet)
router.register(r'destination-entries', DestinationEntryViewSet)
router.register(r'service-bills', ServiceBillViewSet)
router.register(r'transport-items', TransportItemViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]