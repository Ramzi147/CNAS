"""Vue d'ensemble du fichier : apps.py
Role : declaration du module Django pour l'enregistrement de l'application.
Module : module evaluations.
Ce commentaire sert de repere rapide pour comprendre ou intervenir pendant la soutenance.
"""

from django.apps import AppConfig


class EvaluationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.evaluations"


