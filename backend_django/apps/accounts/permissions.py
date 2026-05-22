"""Vue d'ensemble du fichier : permissions.py
Role : regles de controle d'acces appliquees selon le role et le perimetre utilisateur.
Module : module comptes et acces.
Ce commentaire sert de repere rapide pour comprendre ou intervenir pendant la soutenance.
"""

from rest_framework.permissions import BasePermission


class IsAdminOrBetter(BasePermission):
    """Autorise uniquement les roles capables d'administrer globalement l'application."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in {"superadmin", "admin", "hr"}
        )


class IsPrivilegedUser(BasePermission):
    """Autorise tous les roles authentifies utilises dans l'application metier."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in {"superadmin", "admin", "hr", "manager", "agent", "employee"}
        )


def is_admin_or_hr(user):
    """Petit helper reutilise pour les cas ou admin et RH partagent les memes droits."""
    return bool(user and user.is_authenticated and user.role in {"superadmin", "admin", "hr"})


def user_agent(user):
    """Retourne la fiche agent reliee au compte connecte quand elle existe."""
    if not user or not user.is_authenticated:
        return None
    return getattr(user, "agent_profile", None)


def agent_belongs_to_user_scope(agent, user):
    """Verifie qu'un agent appartient bien au perimetre visible du role courant."""
    if is_admin_or_hr(user):
        return True
    current_agent = user_agent(user)
    if not current_agent or not agent:
        return False
    if user.role == "manager":
        return agent.manager_id == current_agent.id
    if user.role in {"agent", "employee"}:
        return agent.id == current_agent.id
    return False


class AdminOrHRCanWrite(BasePermission):
    """Laisse tout le monde lire, mais reserve les ecritures a la DRH et a l'administration."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return is_admin_or_hr(request.user)


class ManagerOwnTeamOnly(BasePermission):
    """Restreint l'acces objet par objet au seul portefeuille d'equipe du manager."""

    def has_object_permission(self, request, view, obj):
        user = request.user
        if is_admin_or_hr(user):
            return True
        current_agent = user_agent(user)
        if not current_agent or getattr(user, "role", None) != "manager":
            return False

        agent = getattr(obj, "agent", None) or getattr(obj, "employee", None)
        if agent:
            return agent.manager_id == current_agent.id

        manager = getattr(obj, "manager", None)
        if manager:
            return manager.id == current_agent.id

        return False


class EmployeeOwnDataOnly(BasePermission):
    """Limite un employe a ses propres donnees lorsque la vue ne porte pas de perimetre manager."""

    def has_object_permission(self, request, view, obj):
        user = request.user
        if is_admin_or_hr(user):
            return True
        current_agent = user_agent(user)
        if not current_agent or getattr(user, "role", None) not in {"agent", "employee"}:
            return False

        agent = getattr(obj, "agent", None) or getattr(obj, "employee", None)
        if agent:
            return agent.id == current_agent.id

        return False


