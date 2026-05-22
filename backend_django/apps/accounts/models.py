"""Vue d'ensemble du fichier : models.py
Role : definitions des entites de donnees et de leurs relations en base.
Module : module comptes et acces.
Ce commentaire sert de repere rapide pour comprendre ou intervenir pendant la soutenance.
"""

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    """Manager du modele utilisateur avec email comme identifiant principal."""

    # Cree un compte standard et s'assure que le mot de passe est hache
    # avant enregistrement en base.
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("L'email est obligatoire.")
        email = self.normalize_email(email)
        extra_fields.setdefault("username", email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    # Cree un compte superadmin pret a acceder a toute l'administration.
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.SUPERADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Compte applicatif commun a tous les roles exposes dans la plateforme."""

    class Role(models.TextChoices):
        SUPERADMIN = "superadmin", "SuperAdmin"
        ADMIN = "admin", "Admin"
        HR = "hr", "RH"
        MANAGER = "manager", "Manager"
        AGENT = "agent", "Agent"

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.AGENT)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "full_name"]

    objects = UserManager()

    def save(self, *args, **kwargs):
        if not self.username:
            self.username = self.email
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} ({self.email})"


