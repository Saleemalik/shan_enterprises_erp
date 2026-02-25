from django.core.management.base import BaseCommand
from django.db import connections, transaction
from erp.models import *


class Command(BaseCommand):
    help = "Migrate old bigint DB to new UUID DB"

    def handle(self, *args, **kwargs):
        old_cursor = connections["old"].cursor()

        with transaction.atomic():

            # =========================================
            # 1️⃣ DESTINATION
            # =========================================
            old_cursor.execute("SELECT id, name, place, description, is_garage FROM erp_destination")
            old_destinations = old_cursor.fetchall()

            dest_map = {}

            for row in old_destinations:
                old_id, name, place, description, is_garage = row

                new_obj = Destination.objects.create(
                    name=name,
                    place=place,
                    description=description,
                    is_garage=is_garage,
                )

                dest_map[old_id] = new_obj

            self.stdout.write(self.style.SUCCESS("Destinations migrated"))


            # =========================================
            # 2️⃣ PLACE
            # =========================================
            old_cursor.execute("SELECT id, name, distance, district, destination_id FROM erp_place")
            old_places = old_cursor.fetchall()

            place_map = {}

            for row in old_places:
                old_id, name, distance, district, destination_id = row

                new_obj = Place.objects.create(
                    name=name,
                    distance=distance,
                    district=district,
                    destination=dest_map.get(destination_id),
                )

                place_map[old_id] = new_obj

            self.stdout.write(self.style.SUCCESS("Places migrated"))


            # =========================================
            # 3️⃣ DEALER
            # =========================================
            old_cursor.execute("SELECT id, code, name, address, pincode, mobile, active FROM erp_dealer")
            old_dealers = old_cursor.fetchall()

            dealer_map = {}

            for row in old_dealers:
                old_id, code, name, address, pincode, mobile, active = row

                new_obj = Dealer.objects.create(
                    code=code,
                    name=name,
                    address=address,
                    pincode=pincode,
                    mobile=mobile,
                    active=active,
                )

                dealer_map[old_id] = new_obj

            self.stdout.write(self.style.SUCCESS("Dealers migrated"))


            # =========================================
            # 4️⃣ RATE RANGE
            # =========================================
            old_cursor.execute("SELECT id, from_km, to_km, rate, is_mtk FROM erp_raterange")
            old_ranges = old_cursor.fetchall()

            range_map = {}

            for row in old_ranges:
                old_id, from_km, to_km, rate, is_mtk = row

                new_obj = RateRange.objects.create(
                    from_km=from_km,
                    to_km=to_km,
                    rate=rate,
                    is_mtk=is_mtk,
                )

                range_map[old_id] = new_obj

            self.stdout.write(self.style.SUCCESS("RateRanges migrated"))


            # =========================================
            # 5️⃣ SERVICE BILL
            # =========================================
            old_cursor.execute("""
                SELECT id, bill_date, to_address, letter_note,
                       date_of_clearing, product, hsn_code, year
                FROM erp_servicebill
            """)
            old_bills = old_cursor.fetchall()

            bill_map = {}

            for row in old_bills:
                old_id, bill_date, to_address, letter_note, \
                date_of_clearing, product, hsn_code, year = row

                new_obj = ServiceBill.objects.create(
                    bill_date=bill_date,
                    to_address=to_address,
                    letter_note=letter_note,
                    date_of_clearing=date_of_clearing,
                    product=product,
                    hsn_code=hsn_code,
                    year=year,
                )

                bill_map[old_id] = new_obj

            self.stdout.write(self.style.SUCCESS("ServiceBills migrated"))

            # =========================================
            # 6️⃣ DESTINATION ENTRY
            # =========================================
            old_cursor.execute("""
                SELECT id, destination_id, letter_note, bill_number,
                       date, to_address, transport_type, service_bill_id
                FROM erp_destinationentry
            """)
            old_entries = old_cursor.fetchall()

            entry_map = {}

            for row in old_entries:
                old_id, destination_id, letter_note, bill_number, \
                date, to_address, transport_type, service_bill_id = row

                new_obj = DestinationEntry.objects.create(
                    destination=dest_map.get(destination_id),
                    letter_note=letter_note,
                    bill_number=bill_number,
                    date=date,
                    to_address=to_address,
                    transport_type=transport_type,
                    service_bill=bill_map.get(service_bill_id),
                )

                entry_map[old_id] = new_obj

            self.stdout.write(self.style.SUCCESS("DestinationEntries migrated"))


            # =========================================
            # 7️⃣ RANGE ENTRY
            # =========================================
            old_cursor.execute("""
                SELECT id, destination_entry_id, rate_range_id,
                       rate, total_bags, total_mt, total_mtk,
                       total_amount, is_transport_fol_slab,
                       print_page_no, service_bill_id
                FROM erp_rangeentry
            """)
            old_range_entries = old_cursor.fetchall()

            range_entry_map = {}

            for row in old_range_entries:
                old_id, dest_entry_id, rate_range_id, rate, \
                total_bags, total_mt, total_mtk, total_amount, \
                is_transport_fol_slab, print_page_no, service_bill_id = row

                new_obj = RangeEntry.objects.create(
                    destination_entry=entry_map.get(dest_entry_id),
                    rate_range=range_map.get(rate_range_id),
                    rate=rate,
                    total_bags=total_bags,
                    total_mt=total_mt,
                    total_mtk=total_mtk,
                    total_amount=total_amount,
                    is_transport_fol_slab=is_transport_fol_slab,
                    print_page_no=print_page_no,
                    service_bill=bill_map.get(service_bill_id),
                )

                range_entry_map[old_id] = new_obj

            self.stdout.write(self.style.SUCCESS("RangeEntries migrated"))

            # =========================================
            # 8️⃣ DEALER ENTRY
            # =========================================
            old_cursor.execute("""
                SELECT id, range_entry_id, dealer_id,
                       despatched_to, km, no_bags, rate,
                       mt, mtk, amount, mda_number,
                       bill_doc, date, description,
                       remarks, service_bill_id
                FROM erp_dealerentry
            """)
            old_dealer_entries = old_cursor.fetchall()

            for row in old_dealer_entries:
                old_id, range_entry_id, dealer_id, \
                despatched_to, km, no_bags, rate, \
                mt, mtk, amount, mda_number, \
                bill_doc, date, description, \
                remarks, service_bill_id = row

                DealerEntry.objects.create(
                    range_entry=range_entry_map.get(range_entry_id),
                    dealer=dealer_map.get(dealer_id),
                    despatched_to=despatched_to,
                    km=km,
                    no_bags=no_bags,
                    rate=rate,
                    mt=mt,
                    mtk=mtk,
                    amount=amount,
                    mda_number=mda_number,
                    bill_doc=bill_doc,
                    date=date,
                    description=description,
                    remarks=remarks,
                    service_bill=bill_map.get(service_bill_id),
                )

            self.stdout.write(self.style.SUCCESS("DealerEntries migrated"))
            
            # =========================================
            # 9️⃣ HANDLING BILL SECTION
            # =========================================
            old_cursor.execute("""
                SELECT id, bill_number, bill_id,
                    qty_shipped, fol_total, depot_total, rh_sales,
                    qty_received, shortage, particulars, products,
                    total_qty, rate, bill_amount,
                    cgst, sgst, total_bill_amount
                FROM erp_handlingbillsection
            """)
            rows = old_cursor.fetchall()

            for row in rows:
                _, bill_number, bill_id, \
                qty_shipped, fol_total, depot_total, rh_sales, \
                qty_received, shortage, particulars, products, \
                total_qty, rate, bill_amount, \
                cgst, sgst, total_bill_amount = row

                HandlingBillSection.objects.create(
                    bill_number=bill_number,
                    bill=bill_map.get(bill_id),
                    qty_shipped=qty_shipped,
                    fol_total=fol_total,
                    depot_total=depot_total,
                    rh_sales=rh_sales,
                    qty_received=qty_received,
                    shortage=shortage,
                    particulars=particulars,
                    products=products,
                    total_qty=total_qty,
                    rate=rate,
                    bill_amount=bill_amount,
                    cgst=cgst,
                    sgst=sgst,
                    total_bill_amount=total_bill_amount,
                )

            self.stdout.write(self.style.SUCCESS("HandlingBillSection migrated"))
            
            
            # =========================================
            # 🔟 TRANSPORT DEPOT SECTION
            # =========================================
            old_cursor.execute("""
                SELECT id, bill_number, bill_id,
                    total_depot_qty, total_depot_amount
                FROM erp_transportdepotsection
            """)
            rows = old_cursor.fetchall()

            depot_section_map = {}

            for row in rows:
                old_id, bill_number, bill_id, \
                total_depot_qty, total_depot_amount = row

                new_obj = TransportDepotSection.objects.create(
                    bill_number=bill_number,
                    bill=bill_map.get(bill_id),
                    total_depot_qty=total_depot_qty,
                    total_depot_amount=total_depot_amount,
                )

                depot_section_map[old_id] = new_obj

            self.stdout.write(self.style.SUCCESS("TransportDepotSection migrated"))
            
            
            # =========================================
            # 1️⃣1️⃣ TRANSPORT DEPOT ROW
            # =========================================
            old_cursor.execute("""
                SELECT id, depot_section_id, destination_id,
                    range_entry_id, product,
                    qty_mt, km, mt_km, rate, amount
                FROM erp_transportdepotrow
            """)
            rows = old_cursor.fetchall()

            for row in rows:
                _, depot_section_id, destination_id, \
                range_entry_id, product, \
                qty_mt, km, mt_km, rate, amount = row

                TransportDepotRow.objects.create(
                    depot_section=depot_section_map.get(depot_section_id),
                    destination=dest_map.get(destination_id),
                    range_entry=range_entry_map.get(range_entry_id),
                    product=product,
                    qty_mt=qty_mt,
                    km=km,
                    mt_km=mt_km,
                    rate=rate,
                    amount=amount,
                )

            self.stdout.write(self.style.SUCCESS("TransportDepotRow migrated"))
            
            # =========================================
            # 1️⃣2️⃣ TRANSPORT FOL SECTION
            # =========================================
            old_cursor.execute("""
                SELECT id, bill_id, bill_number,
                    rh_qty, grand_total_qty, grand_total_amount
                FROM erp_transportfolsection
            """)
            rows = old_cursor.fetchall()

            fol_section_map = {}

            for row in rows:
                old_id, bill_id, bill_number, \
                rh_qty, grand_total_qty, grand_total_amount = row

                new_obj = TransportFOLSection.objects.create(
                    bill=bill_map.get(bill_id),
                    bill_number=bill_number,
                    rh_qty=rh_qty,
                    grand_total_qty=grand_total_qty,
                    grand_total_amount=grand_total_amount,
                )

                fol_section_map[old_id] = new_obj

            self.stdout.write(self.style.SUCCESS("TransportFOLSection migrated"))
            
            
            # =========================================
            # 1️⃣3️⃣ TRANSPORT FOL SLAB
            # =========================================
            old_cursor.execute("""
                SELECT id, fol_section_id, range_slab, rate,
                    range_total_qty, range_total_mtk, range_total_amount
                FROM erp_transportfolslab
            """)
            rows = old_cursor.fetchall()

            fol_slab_map = {}

            for row in rows:
                old_id, fol_section_id, range_slab, rate, \
                range_total_qty, range_total_mtk, range_total_amount = row

                new_obj = TransportFOLSlab.objects.create(
                    fol_section=fol_section_map.get(fol_section_id),
                    range_slab=range_slab,
                    rate=rate,
                    range_total_qty=range_total_qty,
                    range_total_mtk=range_total_mtk,
                    range_total_amount=range_total_amount,
                )

                fol_slab_map[old_id] = new_obj

            self.stdout.write(self.style.SUCCESS("TransportFOLSlab migrated"))
            
            # =========================================
            # 1️⃣4️⃣ TRANSPORT FOL DESTINATION
            # =========================================
            old_cursor.execute("""
                SELECT id, fol_slab_id, destination_entry_id,
                    destination_place, qty_mt, qty_mtk, amount
                FROM erp_transportfoldestination
            """)
            rows = old_cursor.fetchall()

            for row in rows:
                _, fol_slab_id, destination_entry_id, \
                destination_place, qty_mt, qty_mtk, amount = row

                TransportFOLDestination.objects.create(
                    fol_slab=fol_slab_map.get(fol_slab_id),
                    destination_entry=entry_map.get(destination_entry_id),
                    destination_place=destination_place,
                    qty_mt=qty_mt,
                    qty_mtk=qty_mtk,
                    amount=amount,
                )

            self.stdout.write(self.style.SUCCESS("TransportFOLDestination migrated"))
            
            # =========================================
            # 1️⃣5️⃣ TRANSPORT ITEM
            # =========================================
            old_cursor.execute("""
                SELECT id, name, description
                FROM erp_transportitem
            """)
            rows = old_cursor.fetchall()

            for row in rows:
                _, name, description = row

                TransportItem.objects.create(
                    name=name,
                    description=description,
                )

            self.stdout.write(self.style.SUCCESS("TransportItem migrated"))
            
        self.stdout.write(self.style.SUCCESS("🔥 FULL MIGRATION COMPLETED SUCCESSFULLY"))