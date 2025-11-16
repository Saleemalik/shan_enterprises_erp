from rest_framework import serializers
from .models import Dealer, Place, Destination, RateRange, DealerEntry, RangeEntry, DestinationEntry


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
        source='places',
        required=False
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
        
class DealerEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = DealerEntry
        fields = [
            "id",
            "dealer", "despatched_to", "km",
            "no_bags", "rate", "mt", "mtk", "amount",
            "mda_number", "date", "description", "remarks"
        ]
        read_only_fields = ["id"]

class RangeEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = RangeEntry
        fields = [
            "id", "destination_entry", "rate_range",
            "rate", "total_bags", "total_mt", "total_mtk", "total_amount"
        ]

class RangeEntryWriteSerializer(serializers.ModelSerializer):
    dealer_entries = DealerEntrySerializer(many=True)

    class Meta:
        model = RangeEntry
        fields = [
            "rate_range",
            "rate",
            "total_bags",
            "total_mt",
            "total_mtk",
            "total_amount",
            "dealer_entries",
        ]

class DestinationEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = DestinationEntry
        fields = [
            "id", "destination", "letter_note", "bill_number",
            "date", "to_address", "main_bill"
        ]

class DestinationEntryWriteSerializer(serializers.ModelSerializer):
    ranges = RangeEntryWriteSerializer(many=True)

    class Meta:
        model = DestinationEntry
        fields = [
            "destination",
            "letter_note",
            "bill_number",
            "date",
            "to_address",
            "ranges"
        ]

    def create(self, validated_data):
        ranges_data = validated_data.pop("ranges")
        dest_entry = DestinationEntry.objects.create(**validated_data)
        self._create_ranges(dest_entry, ranges_data)
        return dest_entry

    def update(self, instance, validated_data):
        for field in ["destination", "letter_note", "bill_number", "date", "to_address"]:
            setattr(instance, field, validated_data.get(field, getattr(instance, field)))
        instance.save()

        # Clear & recreate child objects
        instance.rangeentry_set.all().delete()
        self._create_ranges(instance, validated_data.get("ranges", []))

        return instance

    # --------------------------------
    # INTERNAL HELPER (NO DUPLICATION)
    # --------------------------------
    def _create_ranges(self, dest_entry, ranges_data):
        for r in ranges_data:
            dealer_entries_data = r.pop("dealer_entries")

            range_entry = RangeEntry.objects.create(
                destination_entry=dest_entry,
                **r
            )

            DealerEntry.objects.bulk_create([
                DealerEntry(range_entry=range_entry, **d)
                for d in dealer_entries_data
            ])
