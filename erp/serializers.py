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

class DestinatonSerializerReadOnly(serializers.ModelSerializer):
    class Meta:
        model = Destination
        fields = ['id', 'name', 'is_garage']

class DestinationEntrySerializer(serializers.ModelSerializer):
    rate_ranges = serializers.SerializerMethodField()
    main_bill = serializers.SerializerMethodField()
    destination = DestinatonSerializerReadOnly(read_only=True)

    class Meta:
        model = DestinationEntry
        fields = [
            "id",
            "destination",
            
            "date",
            "to_address",
            "bill_number",
            "rate_ranges",
            "main_bill",
        ]

    def get_rate_ranges(self, obj):
        labels = []
        for re in obj.range_entries.select_related("rate_range").all():
            rr = re.rate_range
            if rr:
                from_km = int(rr.from_km) if rr.from_km.is_integer() else rr.from_km
                to_km = int(rr.to_km) if rr.to_km.is_integer() else rr.to_km
                labels.append(f"{from_km}-{to_km}")
        return labels

    def get_main_bill(self, obj):
        if obj.main_bill:
            return {"bill_number": obj.main_bill.bill_number}
        return None

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


class DealerEntrySerializer(serializers.ModelSerializer):
    dealer_name = serializers.CharField(source="dealer.name", read_only=True)

    class Meta:
        model = DealerEntry
        fields = [
            "id",
            "dealer",
            "dealer_name",
            "despatched_to",
            "km",
            "no_bags",
            "rate",
            "mt",
            "mtk",
            "amount",
            "mda_number",
            "date",
            "description",
            "remarks",
        ]


class RangeEntrySerializer(serializers.ModelSerializer):
    rate_range_display = serializers.SerializerMethodField()
    dealer_entries = DealerEntrySerializer(many=True, read_only=True)

    class Meta:
        model = RangeEntry
        fields = [
            "id",
            "rate_range",
            "rate_range_display",
            "rate",
            "total_bags",
            "total_mt",
            "total_mtk",
            "total_amount",
            "dealer_entries",
        ]

    def get_rate_range_display(self, obj):
        rr = obj.rate_range
        return f"{rr.from_km}-{rr.to_km}" if rr else None

class DestinationEntryDetailSerializer(serializers.ModelSerializer):
    range_entries = RangeEntrySerializer(many=True, read_only=True)
    destination = DestinatonSerializerReadOnly()

    class Meta:
        model = DestinationEntry
        fields = [
            "id",
            "destination",
            "date",
            "letter_note",
            "to_address",
            "bill_number",
            "main_bill",
            "range_entries",
        ]
