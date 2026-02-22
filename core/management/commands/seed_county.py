from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from core.models import Department, Location
from inventory.models import Asset, Consumable

User = get_user_model()

class Command(BaseCommand):
    help = "Seed demo data for a small county (departments, locations, sample inventory, users)."

    def handle(self, *args, **options):
        fac, _ = Department.objects.get_or_create(name="Facilities", code="FAC")
        pw, _ = Department.objects.get_or_create(name="Public Works", code="PW")

        fac_main, _ = Location.objects.get_or_create(department=fac, name="Main Building", defaults={"address": "1 County Way"})
        pw_yard, _ = Location.objects.get_or_create(department=pw, name="Public Works Yard", defaults={"address": "99 Service Rd"})

        # Create demo users (password: County123!)
        admin, _ = User.objects.get_or_create(
            username="countyadmin",
            defaults={"role": "COUNTY_ADMIN", "is_staff": True, "is_superuser": True, "email": "admin@county.local"},
        )
        admin.set_password("County123!")
        admin.save()

        mgr, _ = User.objects.get_or_create(
            username="facmanager",
            defaults={"role": "DEPT_MANAGER", "department": fac, "email": "fac@county.local"},
        )
        mgr.set_password("County123!")
        mgr.save()

        staff, _ = User.objects.get_or_create(
            username="facstaff",
            defaults={"role": "STAFF", "department": fac, "email": "staff@county.local"},
        )
        staff.set_password("County123!")
        staff.save()

        Asset.objects.get_or_create(
            asset_tag="FAC-001",
            defaults={
                "name": "Ladder (12ft)",
                "category": "Tools",
                "department": fac,
                "location": fac_main,
                "condition": "GOOD",
                "serial_number": "LD-12-0001",
            },
        )

        Asset.objects.get_or_create(
            asset_tag="PW-001",
            defaults={
                "name": "Generator (Portable)",
                "category": "Equipment",
                "department": pw,
                "location": pw_yard,
                "condition": "NEEDS_REPAIR",
                "serial_number": "GEN-0009",
            },
        )

        Consumable.objects.get_or_create(
            sku="PAPER-A4",
            defaults={
                "name": "A4 Printer Paper",
                "category": "Office Supplies",
                "department": fac,
                "location": fac_main,
                "quantity_on_hand": 2,
                "reorder_level": 10,
                "unit": "ream",
                "supplier": "Staples",
            },
        )

        Consumable.objects.get_or_create(
            sku="SALT-50LB",
            defaults={
                "name": "Road Salt (50lb)",
                "category": "Road Materials",
                "department": pw,
                "location": pw_yard,
                "quantity_on_hand": 40,
                "reorder_level": 25,
                "unit": "bag",
                "supplier": "Local Quarry",
            },
        )

        self.stdout.write(self.style.SUCCESS("✅ Seeded demo county data."))
        self.stdout.write("Login users (password: County123!): countyadmin, facmanager, facstaff")
