from rest_framework import viewsets, filters
from .models import Dealer, Place, Destination, RateRange
from .serializers import DealerSerializer, PlaceSerializer, DestinationSerializer, RateRangeSerializer
from rest_framework.permissions import IsAuthenticated


class PlaceViewSet(viewsets.ModelViewSet):
    queryset = Place.objects.all().order_by("name")
    serializer_class = PlaceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']      
    ordering_fields = ['name', 'distance']  


class DealerViewSet(viewsets.ModelViewSet):
    queryset = Dealer.objects.all().order_by("name")
    serializer_class = DealerSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'mobile', 'places__name'] 
    ordering_fields = ['name', 'code']
    
class RateRangeViewSet(viewsets.ModelViewSet):
    queryset = RateRange.objects.all().order_by("from_km")
    serializer_class = RateRangeSerializer
    permission_classes = [IsAuthenticated]
    
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['from_km', 'to_km']        
    ordering_fields = ['from_km', 'to_km']

class DestinationViewSet(viewsets.ModelViewSet):
    queryset = Destination.objects.all().order_by("name")
    serializer_class = DestinationSerializer
    permission_classes = [IsAuthenticated]
    
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'place']        
    ordering_fields = ['name']  