from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        DEVELOPER = "DEVELOPER", "Developer"
        COUNTY_ADMIN = "COUNTY_ADMIN", "County Admin"
        DEPT_MANAGER = "DEPT_MANAGER", "Department Manager"
        EMPLOYEE = "EMPLOYEE", "Employee"

    role = models.CharField(max_length=32, choices=Role.choices, default=Role.EMPLOYEE)

    department = models.ForeignKey(
        "core.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )


    def __str__(self):
        return f"{self.username} ({self.role})"
