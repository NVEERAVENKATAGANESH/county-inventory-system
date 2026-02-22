from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from core.models import Department
from accounts.models import User as AccountsUser  # for Role choices


class Command(BaseCommand):
    help = "Bootstrap first Department and promote a user to COUNTY_ADMIN with that department."

    def add_arguments(self, parser):
        parser.add_argument("--username", required=True, help="Existing username to promote")
        parser.add_argument("--dept-name", required=True, help="Department name (e.g., Facilities)")
        parser.add_argument("--dept-code", required=True, help="Department code (e.g., FAC)")

    def handle(self, *args, **options):
        username = options["username"]
        dept_name = options["dept_name"]
        dept_code = options["dept_code"]

        UserModel = get_user_model()

        try:
            user = UserModel.objects.get(username=username)
        except UserModel.DoesNotExist:
            raise CommandError(f"User '{username}' does not exist.")

        dept, created = Department.objects.get_or_create(
            code=dept_code,
            defaults={"name": dept_name},
        )

        if not created and dept.name != dept_name:
            dept.name = dept_name
            dept.save()

        user.role = AccountsUser.Role.COUNTY_ADMIN
        user.department = dept
        user.is_staff = True  # allow admin access
        user.save()

        self.stdout.write(self.style.SUCCESS(
            f"Bootstrapped dept {dept.code} and promoted {user.username} to COUNTY_ADMIN."
        ))
