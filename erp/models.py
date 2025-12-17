from django.db import models
from django.core.exceptions import ValidationError

class Destination(models.Model):
    name = models.CharField(max_length=255)
    place = models.CharField(max_length=255, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    is_garage = models.BooleanField(default=False)

    def __str__(self):
        return self.name

class Place(models.Model):
    name = models.CharField(max_length=255)
    distance = models.FloatField()
    district = models.CharField(max_length=255, blank=True, null=True)
    destination = models.ForeignKey(Destination, on_delete=models.CASCADE, blank=True, null=True, related_name="places")
    
    class Meta:
        unique_together = ('name', 'destination')  


    def __str__(self):
        return f"{self.name} ({self.distance} km)"


class Dealer(models.Model):
    code = models.CharField(max_length=255, unique=True)
    name = models.CharField(max_length=255)

    places = models.ManyToManyField("Place", related_name="dealers")
    address = models.TextField(null=True, blank=True)
    pincode = models.CharField(max_length=20, null=True, blank=True)
    mobile = models.CharField(max_length=20, null=True, blank=True)

    active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.code} - {self.name}"


class RateRange(models.Model):
    from_km = models.FloatField()
    to_km = models.FloatField()
    rate = models.FloatField()
    is_mtk = models.BooleanField(default=True)  # TRUE = rate * MTK, FALSE = flat MT * rate

    def __str__(self):
        return f"{self.from_km} km → {self.to_km} km"


class DestinationEntry(models.Model):
    destination = models.ForeignKey(Destination, on_delete=models.CASCADE)
    letter_note = models.TextField(null=True, blank=True)
    bill_number = models.CharField(max_length=255, null=True, blank=True)
    date = models.CharField(max_length=255)
    to_address = models.TextField(null=True, blank=True)
    type_choices = [
            ('TRANSPORT_DEPOT', 'Transport Depot'),
            ('TRANSPORT_FOL', 'Transport FOL'),
        ]
    transport_type = models.CharField(max_length=20, choices=type_choices, blank=True, null=True)

    service_bill = models.ForeignKey("ServiceBill", on_delete=models.SET_NULL, null=True, blank=True, related_name="destination_entries")

    def __str__(self):
        return f"Entry #{self.id} - {self.destination.name}"
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        
    def clean(self):
        if self.service_bill and not self.transport_type:
            raise ValidationError(
                "Transport type is required when assigning to a Service Bill."
            )

        if self.service_bill:
            # ensure entry is not already linked elsewhere
            qs = DestinationEntry.objects.filter(
                id=self.id
            ).exclude(service_bill=self.service_bill)

            if qs.exists():
                raise ValidationError(
                    "Destination entry is already linked to another Service Bill."
                )


class RangeEntry(models.Model):
    destination_entry = models.ForeignKey(DestinationEntry, on_delete=models.CASCADE, related_name="range_entries")
    rate_range = models.ForeignKey(RateRange, on_delete=models.SET_NULL, null=True)

    rate = models.FloatField()
    total_bags = models.IntegerField(null=True, blank=True)
    total_mt = models.FloatField(null=True, blank=True)
    total_mtk = models.FloatField(null=True, blank=True)
    total_amount = models.FloatField(null=True, blank=True)
    is_transport_fol_slab = models.BooleanField(default=False)
    fol_slab = models.ForeignKey(
        'TransportFOLSlab',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="range_entries"
    )

    def __str__(self):
        return f"{self.destination_entry} | Slab: {self.rate_range}"
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def clean(self):
        # FOL slab rules
        if self.is_transport_fol_slab:
            if not self.fol_slab:
                raise ValidationError(
                    "FOL slab must be selected when marked as transport FOL slab."
                )

            if self.destination_entry.transport_type != "TRANSPORT_FOL":
                raise ValidationError(
                    "FOL slab entries must belong to TRANSPORT_FOL destination entries."
                )
        else:
            if self.fol_slab:
                raise ValidationError(
                    "FOL slab should be empty for non-FOL range entries."
                )


class DealerEntry(models.Model):
    range_entry = models.ForeignKey(RangeEntry, on_delete=models.CASCADE, related_name="dealer_entries")
    dealer = models.ForeignKey(Dealer, on_delete=models.SET_NULL, null=True)

    despatched_to = models.CharField(max_length=255, null=True, blank=True)
    km = models.FloatField(null=True, blank=True)
    no_bags = models.IntegerField()
    rate = models.FloatField()
    mt = models.FloatField()
    mtk = models.FloatField()
    amount = models.FloatField()

    mda_number = models.CharField(max_length=255)
    date = models.CharField(max_length=255)
    description = models.CharField(max_length=255, default="FACTOM FOS")
    remarks = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"{self.mda_number} - {self.dealer}"
    

class ServiceBill(models.Model):
    bill_date = models.DateField(null=True, blank=True)
    to_address = models.TextField(null=True, blank=True)
    letter_note = models.TextField(null=True, blank=True)
    date_of_clearing = models.CharField(max_length=255)
    product = models.CharField(max_length=255, default="FACTOMFOS")
    hsn_code = models.CharField(max_length=255, null=True, blank=True)
    year = models.CharField(max_length=50, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"Service Bill #{self.id}"
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
      
    

class HandlingBillSection(models.Model):
    bill_number = models.CharField(max_length=255, unique=True)
    bill = models.OneToOneField(
        ServiceBill,
        related_name="handling",
        on_delete=models.CASCADE
    )

    qty_shipped = models.FloatField(null=True, blank=True)
    fol_total = models.FloatField(null=True, blank=True)
    depot_total = models.FloatField(null=True, blank=True)
    rh_sales = models.FloatField(null=True, blank=True)

    qty_received = models.FloatField(null=True, blank=True)
    shortage = models.FloatField(null=True, blank=True)

    particulars = models.CharField(max_length=255, null=True, blank=True)
    products = models.CharField(max_length=255, null=True, blank=True)

    total_qty = models.FloatField(null=True, blank=True)
    bill_amount = models.FloatField(null=True, blank=True)

    cgst = models.FloatField(null=True, blank=True)
    sgst = models.FloatField(null=True, blank=True)
    total_bill_amount = models.FloatField(null=True, blank=True)
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def clean(self):
        if self.total_bill_amount is not None:
            expected = (self.bill_amount or 0) + (self.cgst or 0) + (self.sgst or 0)
            if round(expected, 2) != round(self.total_bill_amount, 2):
                raise ValidationError(
                    "Total bill amount must equal bill amount + CGST + SGST."
                )

class TransportDepotSection(models.Model):
    bill_number = models.CharField(max_length=255, unique=True)
    bill = models.OneToOneField(
        ServiceBill,
        related_name="transport_depot",
        on_delete=models.CASCADE
    )

    total_depot_qty = models.FloatField(null=True, blank=True)
    total_depot_amount = models.FloatField(null=True, blank=True)
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def clean(self):
        # must have at least one depot destination
        depot_entries = self.bill.destination_entries.filter(
            transport_type="TRANSPORT_DEPOT"
        )

        if not depot_entries.exists():
            raise ValidationError(
                "Transport Depot section requires at least one TRANSPORT_DEPOT destination entry."
            )
    
class TransportFOLSection(models.Model):
    bill_number = models.CharField(max_length=255, unique=True)
    bill = models.OneToOneField(
        ServiceBill,
        related_name="transport_fol",
        on_delete=models.CASCADE
    )
    
    rh_qty = models.FloatField(null=True, blank=True)
    total_fol_qty = models.FloatField(null=True, blank=True)
    total_fol_amount = models.FloatField(null=True, blank=True)
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def clean(self):
        fol_entries = self.bill.destination_entries.filter(
            transport_type="TRANSPORT_FOL"
        )

        if not fol_entries.exists():
            raise ValidationError(
                "Transport FOL section requires at least one TRANSPORT_FOL destination entry."
            )

class TransportFOLSlab(models.Model):
    fol_section = models.ForeignKey(
        TransportFOLSection,
        related_name="slabs",
        on_delete=models.CASCADE
    )

    slab_range = models.ForeignKey(
        RateRange,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    total_qty = models.FloatField()
    total_mtk = models.FloatField(null=True, blank=True)
    total_amount = models.FloatField()


    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def clean(self):
        # All range entries under this slab must belong to same ServiceBill
        bill = self.fol_section.bill

        invalid_ranges = self.range_entries.exclude(
            destination_entry__service_bill=bill
        )

        if invalid_ranges.exists():
            raise ValidationError(
                "FOL slab can only contain range entries from the same Service Bill."
            )