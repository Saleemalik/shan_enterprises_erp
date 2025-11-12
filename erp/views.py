from .models import Dealer, Place, Destination, RateRange
from .serializers import DealerSerializer, PlaceSerializer, DestinationSerializer, RateRangeSerializer
from .base import AppBaseViewSet


class PlaceViewSet(AppBaseViewSet):
    queryset = Place.objects.all().order_by("name")
    serializer_class = PlaceSerializer
    search_fields = ['name', 'district', 'destination__name']      
    ordering_fields = ['name', 'distance', 'district', 'destination__name']  


class DealerViewSet(AppBaseViewSet):
    queryset = Dealer.objects.all().order_by("name")
    serializer_class = DealerSerializer
    search_fields = ['name', 'code', 'mobile', 'places__name'] 
    ordering_fields = ['name', 'code']
    
class RateRangeViewSet(AppBaseViewSet):
    queryset = RateRange.objects.all().order_by("from_km")
    serializer_class = RateRangeSerializer
    search_fields = ['from_km', 'to_km']        
    ordering_fields = ['from_km', 'to_km']

class DestinationViewSet(AppBaseViewSet):
    queryset = Destination.objects.all().order_by("name")
    serializer_class = DestinationSerializer
    search_fields = ['name', 'place']        
    ordering_fields = ['name']  