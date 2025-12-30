from rest_framework import serializers
from .models import Dealer, Place, Destination, RateRange, DealerEntry, RangeEntry, DestinationEntry, HandlingBillSection, TransportDepotSection, TransportFOLSection, ServiceBill, TransportFOLDestination, TransportFOLSlab
from .utils import generate_dealer_code
from django.db import transaction
from django.db.models import Q

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
    distance = serializers.FloatField(required=False)
    mobile = serializers.CharField(required=False, allow_blank=True)
    pincode = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    garage_details = serializers.SerializerMethodField()
    class Meta:
        model = Destination
        fields = [
            'id', 'name', 'place', 'description', 'is_garage',
            'distance','mobile','pincode','address',

            # return values for edit mode
            'garage_details',
        ]
        
    ## GET DISTANCE FROM PLACE TABLE
    def get_garage_details(self, obj):
        if not obj.is_garage:
            return None

        place = Place.objects.filter(name=obj.name, destination=obj).first()
        dealer = Dealer.objects.filter(name=obj.name).first()

        return {
            "distance": place.distance if place else None,
            "mobile": dealer.mobile if dealer else None,
            "pincode": dealer.pincode if dealer else None,
            "address": dealer.address if dealer else None,
        }

    def validate(self, data):
        if data.get("is_garage"):
            if not data.get("distance"):
                raise serializers.ValidationError({"distance": "Distance required for garage"})
        return data

    def create(self, validated_data):
        name = validated_data.get("name")
        is_garage = validated_data.get("is_garage")
        distance = validated_data.pop("distance", None)
        mobile = validated_data.pop("mobile", None)
        pincode = validated_data.pop("pincode", None)
        address = validated_data.pop("address", None)

        destination = super().create(validated_data)

        if is_garage:
            place, created = Place.objects.get_or_create(
                name=name,
                destination=destination,
                defaults={"distance": distance}
            )
            if not created:
                place.distance = distance
                place.save()

            dealer_code = generate_dealer_code()

            dealer = Dealer.objects.create(
                code=dealer_code,
                name=destination.name,
                mobile=mobile,
                pincode=pincode,
                address=address
            )
            dealer.places.add(place)

        return destination

    def update(self, instance, validated_data):
        old_name = instance.name
        new_name = validated_data.get("name", instance.name)
        is_garage = validated_data.get("is_garage", instance.is_garage)

        distance = validated_data.pop("distance", None)
        mobile = validated_data.pop("mobile", None)
        pincode = validated_data.pop("pincode", None)
        address = validated_data.pop("address", None)

        destination = super().update(instance, validated_data)

        if not is_garage:
            dealer = Dealer.objects.filter(name=old_name).first()
            if dealer:
                dealer.delete()
            place = Place.objects.filter(name=old_name, destination=destination).first()
            if place:
                place.delete()
            return destination

        # -------------------------------------------
        # PLACE
        # -------------------------------------------
        if old_name != new_name:
            place = Place.objects.filter(name=old_name, destination=destination).first()
            if place:
                place.name = new_name
                place.distance = distance if distance is not None else place.distance
                place.save()
            else:
                place = Place.objects.create(
                    name=new_name,
                    destination=destination,
                    distance=distance or 0
                )
        else:
            place, created = Place.objects.get_or_create(
                name=new_name,
                destination=destination,
                defaults={"distance": distance or 0}
            )
            if not created and distance is not None:
                place.distance = distance
                place.save()

        # -------------------------------------------
        # DEALER
        # -------------------------------------------
        # Find dealer by old name IF renamed else by new name
        dealer_name_lookup = old_name if old_name != new_name else new_name
        dealer = Dealer.objects.filter(name=dealer_name_lookup).first()

        if dealer:
            dealer.name = new_name
            dealer.mobile = mobile
            dealer.pincode = pincode
            dealer.address = address
            dealer.save()
        else:
            dealer = Dealer.objects.create(
                code=generate_dealer_code(),
                name=new_name,
                mobile=mobile,
                pincode=pincode,
                address=address
            )

        dealer.places.add(place)

        return destination

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
    service_bill = serializers.SerializerMethodField()
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
            "service_bill",
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

    def get_service_bill(self, obj):
        if obj.service_bill:
            return {"bill_date": obj.service_bill.bill_date, "id": obj.service_bill.id}
        return None

class DestinationEntryWriteSerializer(serializers.ModelSerializer):
    range_entries = RangeEntryWriteSerializer(many=True)

    class Meta:
        model = DestinationEntry
        fields = [
            "destination",
            "letter_note",
            "bill_number",
            "date",
            "to_address",
            "range_entries",
        ]

    def create(self, validated_data):
        ranges_data = validated_data.pop("range_entries")
        dest_entry = DestinationEntry.objects.create(**validated_data)
        self._create_ranges(dest_entry, ranges_data)
        return dest_entry

    def update(self, instance, validated_data):
        for field in ["destination", "letter_note", "bill_number", "date", "to_address"]:
            setattr(instance, field, validated_data.get(field, getattr(instance, field)))
        instance.save()

        # Clear & recreate child objects
        instance.range_entries.all().delete()
        self._create_ranges(instance, validated_data.get("range_entries", []))
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
            "service_bill",
            "range_entries",
        ]

class TransportDepotDealerEntrySerializer(serializers.ModelSerializer):
    destination = serializers.CharField(
        source="range_entry.destination_entry.destination.name",
        read_only=True
    )
    destination_entry_id = serializers.IntegerField(
        source="range_entry.destination_entry.id",
        read_only=True
    )

    qty_mt = serializers.FloatField(
        source="mt",
        read_only=True
    )

    km = serializers.FloatField(read_only=True)

    mt_km = serializers.FloatField(
        source="mtk",
        read_only=True
    )

    rate = serializers.FloatField(read_only=True)
    amount = serializers.FloatField(read_only=True)

    number = serializers.CharField(
        source="mda_number",
        read_only=True
    )

    class Meta:
        model = DealerEntry
        fields = [
            "id",
            "destination_entry_id",  # Destination
            "destination",   # Destination
            "qty_mt",        # Qty / MT
            "km",            # KM
            "mt_km",         # MT × KM
            "rate",          # Rate
            "amount",        # Amount
            "number",        # No.
        ]


class HandlingSectionSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = HandlingBillSection
        exclude = ("bill",)
        extra_kwargs = {
            "bill_number": {"validators": []},
        }


class TransportDepotSectionSerializer(serializers.ModelSerializer):
    # list of dealer entery ids
    entries = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = TransportDepotSection
        exclude = ("bill",)
        extra_kwargs = {
            "bill_number": {"validators": []},
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)

        # READ: compute entries dynamically
        data["entries"] = list(
            DealerEntry.objects
            .filter(
                Q(service_bill=instance.bill) &
                (
                    Q(range_entry__destination_entry__transport_type="TRANSPORT_DEPOT")
                    | Q(range_entry__destination_entry__destination__is_garage=True)
                )
            )
            .values_list("id", flat=True)
        )

        return data


class TransportFOLSectionSerializer(serializers.ModelSerializer):
    # WRITE: accept slabs payload
    slabs = serializers.JSONField(
        write_only=True,
        required=False
    )
    
    destination_entry_ids = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = TransportFOLSection
        exclude = ("bill",)
        extra_kwargs = {
            "bill_number": {"validators": []},
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)

        slabs_data = []
        slabs = (
            instance.slabs
            .prefetch_related("destinations")
            .all()
            .order_by("range_slab")
        )

        for slab in slabs:
            slabs_data.append({
                "range_slab": slab.range_slab,
                "rate": slab.rate,
                "range_total_qty": slab.range_total_qty,
                "range_total_mtk": slab.range_total_mtk,
                "range_total_amount": slab.range_total_amount,
                "destinations": [
                    {
                        "id": d.id,
                        "destination_entry_id": d.destination_entry.id,
                        "destination_place": d.destination_place,
                        "qty_mt": d.qty_mt,
                        "qty_mtk": d.qty_mtk,
                        "amount": d.amount,
                    }
                    for d in slab.destinations.all() # transport_fol_destinations not destinations
                ]
            })

        # READ: inject slabs into output
        data["slabs"] = slabs_data
        return data
    
    def get_destination_entry_ids(self, instance):
        """
        Collect UNIQUE destination_entry IDs
        used in this Transport FOL Section
        """
        qs = (
            TransportFOLDestination.objects
            .filter(
                fol_slab__fol_section=instance,
                destination_entry__isnull=False
            )
            .values_list("destination_entry_id", flat=True)
            .distinct()
        )

        return list(qs)

class ServiceBillSerializer(serializers.ModelSerializer):
    handling = HandlingSectionSerializer(required=False, allow_null=True)
    depot = TransportDepotSectionSerializer(
        required=False,
        source="transport_depot",
        allow_null=True
    )
    fol = TransportFOLSectionSerializer(
        required=False,
        source="transport_fol",
        allow_null=True
    )

    class Meta:
        model = ServiceBill
        fields = "__all__"

    # =========================
    # PRIVATE HELPERS
    # =========================

    def _sync_handling(self, bill, handling_data):
        if handling_data is None:
            return

        HandlingBillSection.objects.update_or_create(
            bill=bill,
            defaults=handling_data,
        )

    def _sync_depot(self, bill, depot_data):
        if depot_data is None:
            return

        depot_entries_ids = depot_data.pop("entries", [])

        depot_section, _ = TransportDepotSection.objects.update_or_create(
            bill=bill,
            defaults=depot_data
        )

        # unlink removed entries
        DealerEntry.objects.filter(
            service_bill=bill
        ).exclude(
            id__in=depot_entries_ids
        ).update(service_bill=None)

        # link selected entries
        DealerEntry.objects.filter(
            id__in=depot_entries_ids
        ).update(service_bill=bill)

    def _sync_fol(self, bill, fol_data):
        if fol_data is None:
            return

        fol_slabs = fol_data.pop("slabs", [])

        fol_section, _ = TransportFOLSection.objects.update_or_create(
            bill=bill,
            defaults={
                "bill_number": fol_data["bill_number"],
                "rh_qty": fol_data.get("rh_qty", 0),
                "grand_total_qty": fol_data.get("grand_total_qty", 0),
                "grand_total_amount": fol_data.get("grand_total_amount", 0),
            }
        )

        # unlink old destination entries
        DestinationEntry.objects.filter(
            transport_fol_destinations__fol_slab__fol_section=fol_section
        ).update(
            service_bill=None,
            transport_type=None
        )

        # clear old slabs
        fol_section.slabs.all().delete()

        # recreate slabs + destinations
        for slab in fol_slabs:
            destinations = slab.pop("destinations", [])

            fol_slab = TransportFOLSlab.objects.create(
                fol_section=fol_section,
                **slab
            )

            for dest in destinations:
                TransportFOLDestination.objects.create(
                    fol_slab=fol_slab,
                    **dest
                )

                DestinationEntry.objects.filter(
                    id=dest["destination_entry_id"]
                ).update(
                    service_bill=bill,
                    transport_type="TRANSPORT_FOL"
                )

    # =========================
    # CREATE
    # =========================
    @transaction.atomic
    def create(self, validated_data):
        handling_data = validated_data.pop("handling", None)
        depot_data = validated_data.pop("transport_depot", None)
        fol_data = validated_data.pop("transport_fol", None)

        bill = ServiceBill.objects.create(**validated_data)

        self._sync_handling(bill, handling_data)
        self._sync_depot(bill, depot_data)
        self._sync_fol(bill, fol_data)

        return bill

    # =========================
    # UPDATE
    # =========================
    @transaction.atomic
    def update(self, instance, validated_data):
        handling_data = validated_data.pop("handling", None)
        depot_data = validated_data.pop("transport_depot", None)
        fol_data = validated_data.pop("transport_fol", None)

        # update bill fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        self._sync_handling(instance, handling_data)
        self._sync_depot(instance, depot_data)
        self._sync_fol(instance, fol_data)

        return instance

    def to_representation(self, instance):
        instance = (
            ServiceBill.objects
            .select_related("handling", "transport_depot", "transport_fol")
            .prefetch_related(
                "transport_fol__slabs",
                "transport_fol__slabs__destinations"
            )
            .get(pk=instance.pk)
        )
        return super().to_representation(instance)
    