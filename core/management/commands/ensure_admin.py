import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Create an initial superuser if one does not exist (safe for deploy)."

    def handle(self, *args, **options):
        username = (os.getenv("ADMIN_USERNAME") or "").strip()
        email    = (os.getenv("ADMIN_EMAIL") or "").strip()
        password = (os.getenv("ADMIN_PASSWORD") or "").strip()

        if not username or not password:
            self.stdout.write(self.style.WARNING(
                "ADMIN_USERNAME/ADMIN_PASSWORD not set; skipping ensure_admin."
            ))
            return

        User = get_user_model()

        # If username exists, ensure it's staff + superuser
        user = User.objects.filter(username=username).first()
        if user:
            changed = False
            if not user.is_staff:
                user.is_staff = True
                changed = True
            if not user.is_superuser:
                user.is_superuser = True
                changed = True
            if email and user.email != email:
                user.email = email
                changed = True

            if changed:
                user.save()
                self.stdout.write(self.style.SUCCESS(
                    f"Updated existing user '{username}' to be admin."
                ))
            else:
                self.stdout.write(self.style.SUCCESS(
                    f"Admin user '{username}' already exists."
                ))
            return

        # Create new admin user
        User.objects.create_superuser(
            username=username,
            email=email or "",
            password=password,
        )
        self.stdout.write(self.style.SUCCESS(
            f"Created admin user '{username}'."
        ))