from django.db import models

class Department(models.Model):
    name = models.CharField(max_length=120, unique=True)
    code = models.CharField(max_length=20, unique=True)

    def __str__(self):
        return f"{self.name} ({self.code})"

class Location(models.Model):
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name="locations")
    name = models.CharField(max_length=120)
    address = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        unique_together = [("department", "name")]

    def __str__(self):
        return f"{self.department.code} - {self.name}"
