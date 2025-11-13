from rest_framework import serializers
from .models import Dealer, Place, Destination, RateRange


class PlaceSerializer(serializers.ModelSerializer):
    destination_name = serializers.CharField(source="destination.name", read_only=True)


    class Meta:
        model = Place
        fields = ['id', 'name', 'distance', 'district', 'destination', 'destination_name']


class DealerSerializer(serializers.ModelSerializer):
    places = PlaceSerializer(many=True, read_only=True)
    place_ids = serializers.PrimaryKeyRelatedField(
        queryset=Place.objects.all(),
        many=True,
        write_only=True,
        source='places'
    )

    class Meta:
        model = Dealer
        fields = '__all__'
        

     
class RateRangeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RateRange
        fields = "__all__"
        

class DestinationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Destination
        fields = "__all__"   # send all columns to frontend
        
   

