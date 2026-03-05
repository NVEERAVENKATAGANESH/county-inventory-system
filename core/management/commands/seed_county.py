"""
seed_county.py — Rich demo data for UIMS.

Creates:
  - 4 departments: Facilities (FAC), Public Works (PW), IT, Human Resources (HR)
  - 6 users (all password: County123!)
  - 10 assets (mix of conditions, warranties, assignments, purchase prices)
  - 8 consumables (several below reorder level for low-stock demo)
  - 4 maintenance records
  - 3 inventory requests (PENDING + APPROVED)

Run:  python manage.py seed_county
"""
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import Department, Location
from inventory.models import Asset, Consumable, InventoryRequest, MaintenanceRecord

User = get_user_model()
TODAY = date.today()


class Command(BaseCommand):
    help = "Seed rich demo data for UIMS (4 depts, 6 users, 10 assets, 8 consumables, maintenance, requests)."

    def handle(self, *args, **options):
        # ── Departments — use code as the stable lookup key ──────────────────────
        fac, _ = Department.objects.get_or_create(code="FAC", defaults={"name": "Facilities"})
        pw,  _ = Department.objects.get_or_create(code="PW",  defaults={"name": "Public Works"})
        it,  _ = Department.objects.get_or_create(code="IT",  defaults={"name": "IT"})
        hr,  _ = Department.objects.get_or_create(code="HR",  defaults={"name": "Human Resources"})

        # ── Locations ────────────────────────────────────────────────────────────
        fac_main, _ = Location.objects.get_or_create(department=fac, name="Main Building",    defaults={"address": "1 County Way"})
        fac_stor, _ = Location.objects.get_or_create(department=fac, name="Storage Room",      defaults={"address": "1 County Way - Basement"})
        pw_yard,  _ = Location.objects.get_or_create(department=pw,  name="Public Works Yard", defaults={"address": "99 Service Rd"})
        it_room,  _ = Location.objects.get_or_create(department=it,  name="Server Room",       defaults={"address": "2 Tech Blvd - Level B"})
        hr_off,   _ = Location.objects.get_or_create(department=hr,  name="HR Office",         defaults={"address": "3 Admin Plaza - Floor 2"})

        # ── Users ────────────────────────────────────────────────────────────────
        def mkuser(uname, role, dept, email, first, last, is_staff=False):
            u, _ = User.objects.get_or_create(username=uname, defaults={
                "role": role, "department": dept, "email": email,
                "first_name": first, "last_name": last, "is_staff": is_staff,
            })
            u.set_password("County123!")
            u.save()
            return u

        admin  = mkuser("countyadmin", "COUNTY_ADMIN", None, "admin@county.local", "Admin", "User",    is_staff=True)
        _dev   = mkuser("devuser",     "DEVELOPER",    None, "dev@county.local",  "Dev",   "User",    is_staff=True)
        facmgr = mkuser("facmanager",  "DEPT_MANAGER", fac,  "fac@county.local",  "Alice", "Manager")
        facstf = mkuser("facstaff",    "EMPLOYEE",     fac,  "staff@county.local","Bob",   "Staff")
        _itmgr = mkuser("itadmin",     "DEPT_MANAGER", it,   "it@county.local",   "Carol", "IT")
        pwstf  = mkuser("pwstaff",     "EMPLOYEE",     pw,   "pw@county.local",   "Dave",  "Works")
        hrstf  = mkuser("hrstaff",     "EMPLOYEE",     hr,   "hr@county.local",   "Eve",   "HR")

        # ── Assets ───────────────────────────────────────────────────────────────
        def mkasset(tag, name, cat, dept, loc, cond, serial="",
                    price=None, purchase_days_ago=365, warranty_days=None,
                    assigned=None, notes=""):
            wexp = (TODAY + timedelta(days=warranty_days)) if warranty_days is not None else None
            a, _ = Asset.objects.get_or_create(asset_tag=tag, defaults={
                "name": name, "category": cat, "department": dept, "location": loc,
                "condition": cond, "serial_number": serial, "purchase_price": price,
                "purchase_date": TODAY - timedelta(days=purchase_days_ago),
                "warranty_expiry": wexp, "assigned_to": assigned, "notes": notes,
            })
            return a

        # Facilities
        a1 = mkasset("FAC-001", "12ft Extension Ladder",       "Tools",     fac, fac_stor, "GOOD",        "LD-001",   180,  365,  None,  None,   "")
        a2 = mkasset("FAC-002", "Power Drill (DeWalt 20V)",    "Tools",     fac, fac_main, "GOOD",        "DD-201",   299,  400,  20,    facstf, "Assigned to Bob for routine maintenance work")
        a3 = mkasset("FAC-003", "HVAC Unit (Rooftop #1)",      "Equipment", fac, fac_main, "NEEDS_REPAIR","HVAC-09",  8500, 365,  20,    None,   "Reported noisy — vendor scheduled")

        # Public Works
        a4 = mkasset("PW-001",  "Portable Generator 5kW",      "Equipment", pw,  pw_yard,  "NEEDS_REPAIR","GEN-009",  1200, 400,  None,  None,   "Carburetor needs replacement")
        a5 = mkasset("PW-002",  "Pickup Truck F-150 (2022)",   "Vehicle",   pw,  pw_yard,  "GOOD",        "VIN-F150", 32000,365,  730,   pwstf,  "Assigned to Dave Works")

        # IT
        a6 = mkasset("IT-001",  "Dell PowerEdge R750 Server",  "IT",        it,  it_room,  "GOOD",        "DPE-001",  4500, 730,  900,   None,   "")
        a7 = mkasset("IT-002",  "Cisco Catalyst 2960 Switch",  "IT",        it,  it_room,  "GOOD",        "CSW-048",  1800, 730,  1100,  None,   "")
        a8 = mkasset("IT-003",  "HP LaserJet Pro M404dn",      "Printer",   it,  it_room,  "GOOD",        "HPL-003",  650,  500,  -10,   None,   "Warranty expired — monitor closely")

        # HR
        _a9  = mkasset("HR-001", "Uplift Standing Desk",       "Furniture", hr,  hr_off,   "GOOD",        "",         750,  365,  None,  None,   "")
        _a10 = mkasset("HR-002", "Ergonomic Chair (H. Miller)","Furniture", hr,  hr_off,   "RETIRED",     "",         400,  1095, None,  hrstf,  "Marked retired — pending disposal")

        # ── Consumables ──────────────────────────────────────────────────────────
        def mkcons(sku, name, cat, dept, loc, qty, reorder, unit="each", supplier=""):
            Consumable.objects.get_or_create(sku=sku, defaults={
                "name": name, "category": cat, "department": dept, "location": loc,
                "quantity_on_hand": qty, "reorder_level": reorder,
                "unit": unit, "supplier": supplier,
            })

        mkcons("PAPER-A4",    "A4 Printer Paper (Ream)",  "Office",  fac, fac_stor,  2,  10, "ream",   "Staples")        # LOW
        mkcons("PENS-BOX",    "Ballpoint Pens (Box/12)",  "Office",  fac, fac_main,  24,  5, "box",    "Staples")
        mkcons("SALT-50LB",   "Road Salt 50lb Bag",       "Road",    pw,  pw_yard,   40, 25, "bag",    "Local Quarry")
        mkcons("DIESEL-GAL",  "Diesel Fuel (Gallon)",     "Fuel",    pw,  pw_yard,    8, 50, "gallon", "City Fuel Co")    # CRITICAL
        mkcons("TONER-HP507", "HP 507A Toner Cartridge",  "Printer", it,  it_room,    1,  2, "each",   "HP Store")       # LOW
        mkcons("USBC-2M",     "USB-C Cable 2m",           "IT",      it,  it_room,    3,  5, "each",   "TechSupplies")   # LOW
        mkcons("HDMI-1M",     "HDMI Cable 1m",            "IT",      it,  it_room,    6,  4, "each",   "TechSupplies")
        mkcons("SANITIZER",   "Hand Sanitizer 500mL",     "Hygiene", hr,  hr_off,    12,  8, "bottle", "MedSupply")

        # ── Maintenance Records ───────────────────────────────────────────────────
        def mkrec(asset, mtype, desc, cost, performed_by, days_ago, next_days=None):
            MaintenanceRecord.objects.get_or_create(
                asset=asset, date=TODAY - timedelta(days=days_ago),
                defaults={
                    "maintenance_type": mtype, "description": desc,
                    "cost": cost, "performed_by": performed_by,
                    "next_due_date": (TODAY + timedelta(days=next_days)) if next_days else None,
                    "logged_by": admin,
                }
            )

        mkrec(a3, "CORRECTIVE",  "Replaced compressor fan belt; refrigerant top-up.",            620.00, "HVAC Services Ltd", 14, 180)
        mkrec(a4, "INSPECTION",  "Annual safety inspection — carburetor replacement required.",     0.00, "Dave Works",        7,  30)
        mkrec(a6, "PREVENTIVE",  "Quarterly firmware update, disk health check, BIOS update.",      0.00, "Carol IT",          30, 90)
        mkrec(a8, "CORRECTIVE",  "Fuser unit replaced. Drum and toner levels checked — OK.",      210.00, "HP Certified Tech", 60, 365)

        # ── Inventory Requests ────────────────────────────────────────────────────
        InventoryRequest.objects.get_or_create(
            title="Restock A4 Paper — Facilities",
            defaults={
                "request_type": "CONSUMABLE_RESTOCK",
                "status": "PENDING",
                "requested_by": facstf,
                "department": fac,
                "description": "Running critically low (2 reams left, reorder level is 10). "
                               "Need at least 20 reams to last the month.",
                "quantity": 20,
            }
        )

        InventoryRequest.objects.get_or_create(
            title="HVAC Unit FAC-003 Needs Urgent Repair",
            defaults={
                "request_type": "REPORT_ISSUE",
                "status": "APPROVED",
                "requested_by": facmgr,
                "department": fac,
                "asset": a3,
                "description": "Rooftop HVAC making grinding noise since Monday. "
                               "Contacted HVAC Services Ltd — they confirmed compressor issue.",
                "quantity": 1,
                "admin_notes": "Vendor scheduled for next Tuesday. Approved emergency spend up to $750.",
                "resolved_by": admin,
                "resolved_at": timezone.now() - timedelta(days=3),
            }
        )

        InventoryRequest.objects.get_or_create(
            title="Request new standing desk for HR reception",
            defaults={
                "request_type": "ASSET_REQUEST",
                "status": "PENDING",
                "requested_by": hrstf,
                "department": hr,
                "description": "HR-002 ergonomic chair has been retired. "
                               "Need a replacement standing desk for the reception area.",
                "quantity": 1,
            }
        )

        self.stdout.write(self.style.SUCCESS("✅ Rich demo data seeded successfully."))
        self.stdout.write(self.style.WARNING(
            "\nUsers (password: County123!):\n"
            "  countyadmin — COUNTY_ADMIN (admin)\n"
            "  devuser     — DEVELOPER    (dev)\n"
            "  facmanager  — DEPT_MANAGER (FAC)\n"
            "  facstaff    — EMPLOYEE     (FAC) [has assets assigned]\n"
            "  itadmin     — DEPT_MANAGER (IT)\n"
            "  pwstaff     — EMPLOYEE     (PW)\n"
            "  hrstaff     — EMPLOYEE     (HR)\n"
        ))
