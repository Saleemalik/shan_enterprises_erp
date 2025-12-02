from django.db import models


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

    main_bill = models.ForeignKey("MainBill", on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Entry #{self.id} - {self.destination.name}"


class RangeEntry(models.Model):
    destination_entry = models.ForeignKey(DestinationEntry, on_delete=models.CASCADE, related_name="ranges")
    rate_range = models.ForeignKey(RateRange, on_delete=models.SET_NULL, null=True)

    rate = models.FloatField()
    total_bags = models.IntegerField(null=True, blank=True)
    total_mt = models.FloatField(null=True, blank=True)
    total_mtk = models.FloatField(null=True, blank=True)
    total_amount = models.FloatField(null=True, blank=True)

    def __str__(self):
        return f"{self.destination_entry} | Slab: {self.rate_range}"


class DealerEntry(models.Model):
    range_entry = models.ForeignKey(RangeEntry, on_delete=models.CASCADE)
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


class MainBill(models.Model):
    bill_number = models.CharField(max_length=255, unique=True)
    letter_note = models.TextField(null=True, blank=True)
    to_address = models.TextField(null=True, blank=True)
    date_of_clearing = models.CharField(max_length=255)
    fact_gst_number = models.CharField(max_length=255, null=True, blank=True)
    product = models.CharField(max_length=255, default="FACTOMFOS")
    hsn_sac_code = models.CharField(max_length=255, null=True, blank=True)
    year = models.CharField(max_length=50, null=True, blank=True)
    is_garage = models.BooleanField(default=False)

    def __str__(self):
        return f"Bill #{self.bill_number}"


class MainBillEntry(models.Model):
    main_bill = models.ForeignKey(MainBill, on_delete=models.CASCADE)
    destination_entry = models.ForeignKey(DestinationEntry, on_delete=models.CASCADE)

    def __str__(self):
        return f"Bill: {self.main_bill} → Entry: {self.destination_entry}"
