from django.urls import path
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from .views import DealerViewSet, PlaceViewSet, DestinationViewSet, RateRangeViewSet
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


router = routers.DefaultRouter()
router.register(r'dealers', DealerViewSet)
router.register(r'places', PlaceViewSet)
router.register(r'rate-ranges', RateRangeViewSet)
router.register(r'destinations', DestinationViewSet)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include(router.urls)),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]