"""
conftest.py — Shared pytest fixtures for countyinv backend tests.

All fixtures that require DB access use pytest-django's `db` parameter
(or `transactional_db` for tests that need COMMIT visibility).
"""
import pytest
from core.models import Department, Location
from accounts.models import User
from inventory.models import Asset, Consumable, InventoryRequest


@pytest.fixture
def department(db):
    return Department.objects.create(name="Facilities", code="FAC")


@pytest.fixture
def department_it(db):
    return Department.objects.create(name="Information Technology", code="IT")


@pytest.fixture
def admin_user(db, department):
    u = User.objects.create_user(
        username="testadmin",
        password="Pass1234!",
        role=User.Role.COUNTY_ADMIN,
        department=department,
    )
    return u


@pytest.fixture
def employee_user(db, department):
    return User.objects.create_user(
        username="teststaff",
        password="Pass1234!",
        role=User.Role.EMPLOYEE,
        department=department,
    )


@pytest.fixture
def manager_user(db, department):
    return User.objects.create_user(
        username="testmanager",
        password="Pass1234!",
        role=User.Role.DEPT_MANAGER,
        department=department,
    )


@pytest.fixture
def asset(db, department):
    return Asset.objects.create(
        asset_tag="TST-001",
        name="Test Laptop",
        department=department,
    )


@pytest.fixture
def consumable(db, department):
    return Consumable.objects.create(
        sku="TST-SKU-001",
        name="Copy Paper",
        department=department,
        quantity_on_hand=10,
        reorder_level=5,
    )


@pytest.fixture
def pending_request(db, department, employee_user):
    return InventoryRequest.objects.create(
        request_type=InventoryRequest.ReqType.ASSET_REQUEST,
        title="Need a new laptop",
        requested_by=employee_user,
        department=department,
    )
