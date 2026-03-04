"""
accounts/tests.py — Tests for auth endpoints.

Covers:
  POST /api/auth/login/           — auth_login view
  POST /api/auth/change-password/ — change_password view
"""
import pytest
from rest_framework.test import APIClient


LOGIN_URL    = "/api/auth/login/"
CHANGE_PW_URL = "/api/auth/change-password/"


# ─────────────────────────────────────────────
# POST /api/auth/login/
# ─────────────────────────────────────────────

@pytest.mark.django_db
class TestAuthLogin:
    def setup_method(self):
        self.client = APIClient()

    # ── Success cases ────────────────────────

    def test_login_success_returns_200(self, admin_user):
        res = self.client.post(LOGIN_URL, {"username": "testadmin", "password": "Pass1234!"}, format="json")
        assert res.status_code == 200

    def test_login_returns_username(self, admin_user):
        res = self.client.post(LOGIN_URL, {"username": "testadmin", "password": "Pass1234!"}, format="json")
        assert res.json()["username"] == "testadmin"

    def test_login_county_admin_maps_to_admin_role(self, admin_user):
        res = self.client.post(LOGIN_URL, {"username": "testadmin", "password": "Pass1234!"}, format="json")
        assert res.json()["role"] == "admin"

    def test_login_employee_maps_to_employee_role(self, employee_user):
        res = self.client.post(LOGIN_URL, {"username": "teststaff", "password": "Pass1234!"}, format="json")
        assert res.json()["role"] == "employee"

    def test_login_manager_maps_to_admin_role(self, manager_user):
        res = self.client.post(LOGIN_URL, {"username": "testmanager", "password": "Pass1234!"}, format="json")
        assert res.json()["role"] == "admin"

    def test_login_returns_department_code(self, admin_user):
        res = self.client.post(LOGIN_URL, {"username": "testadmin", "password": "Pass1234!"}, format="json")
        assert res.json()["department_code"] == "FAC"

    def test_login_returns_expected_fields(self, admin_user):
        res = self.client.post(LOGIN_URL, {"username": "testadmin", "password": "Pass1234!"}, format="json")
        data = res.json()
        for field in ("username", "role", "django_role", "department_code", "department_name", "is_active"):
            assert field in data, f"Missing response field: {field}"

    # ── Failure cases ────────────────────────

    def test_login_wrong_password_returns_401(self, admin_user):
        res = self.client.post(LOGIN_URL, {"username": "testadmin", "password": "wrongpass"}, format="json")
        assert res.status_code == 401

    def test_login_wrong_password_error_message(self, admin_user):
        res = self.client.post(LOGIN_URL, {"username": "testadmin", "password": "wrongpass"}, format="json")
        assert "Invalid" in res.json()["detail"]

    def test_login_nonexistent_user_returns_401(self):
        res = self.client.post(LOGIN_URL, {"username": "nobody", "password": "whatever"}, format="json")
        assert res.status_code == 401

    def test_login_empty_username_returns_400(self):
        res = self.client.post(LOGIN_URL, {"username": "", "password": "Pass1234!"}, format="json")
        assert res.status_code == 400

    def test_login_empty_password_returns_400(self, admin_user):
        res = self.client.post(LOGIN_URL, {"username": "testadmin", "password": ""}, format="json")
        assert res.status_code == 400

    def test_login_missing_body_returns_400(self):
        res = self.client.post(LOGIN_URL, {}, format="json")
        assert res.status_code == 400

    def test_login_inactive_user_returns_401(self, admin_user):
        admin_user.is_active = False
        admin_user.save()
        res = self.client.post(LOGIN_URL, {"username": "testadmin", "password": "Pass1234!"}, format="json")
        assert res.status_code == 401

    def test_login_inactive_user_deactivated_message(self, admin_user):
        admin_user.is_active = False
        admin_user.save()
        res = self.client.post(LOGIN_URL, {"username": "testadmin", "password": "Pass1234!"}, format="json")
        assert "deactivated" in res.json()["detail"].lower()


# ─────────────────────────────────────────────
# POST /api/auth/change-password/
# ─────────────────────────────────────────────

@pytest.mark.django_db
class TestChangePassword:
    def setup_method(self):
        self.client = APIClient()

    def _post(self, current, new, confirm, username="testadmin"):
        return self.client.post(
            CHANGE_PW_URL,
            {"current_password": current, "new_password": new, "confirm_password": confirm},
            headers={"X-Username": username},
            format="json",
        )

    def test_change_password_success(self, admin_user):
        res = self._post("Pass1234!", "NewPass999!", "NewPass999!")
        assert res.status_code == 200
        assert "updated" in res.json()["detail"].lower()

    def test_change_password_wrong_current_returns_401(self, admin_user):
        res = self._post("wrongcurrent", "NewPass999!", "NewPass999!")
        assert res.status_code == 401

    def test_change_password_mismatch_returns_400(self, admin_user):
        res = self._post("Pass1234!", "NewPass999!", "Different999!")
        assert res.status_code == 400

    def test_change_password_too_short_returns_400(self, admin_user):
        res = self._post("Pass1234!", "short", "short")
        assert res.status_code == 400

    def test_change_password_same_as_current_returns_400(self, admin_user):
        res = self._post("Pass1234!", "Pass1234!", "Pass1234!")
        assert res.status_code == 400

    def test_change_password_no_username_header_returns_401(self, admin_user):
        res = self.client.post(
            CHANGE_PW_URL,
            {"current_password": "Pass1234!", "new_password": "NewPass999!", "confirm_password": "NewPass999!"},
            format="json",
        )
        assert res.status_code == 401

    def test_change_password_missing_fields_returns_400(self, admin_user):
        res = self.client.post(
            CHANGE_PW_URL,
            {"current_password": "Pass1234!"},
            headers={"X-Username": "testadmin"},
            format="json",
        )
        assert res.status_code == 400
