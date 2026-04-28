from rest_framework.permissions import BasePermission


class IsAdminOrBetter(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in {"superadmin", "admin", "hr"}
        )


class IsPrivilegedUser(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in {"superadmin", "admin", "hr", "manager", "agent", "employee"}
        )


def is_admin_or_hr(user):
    return bool(user and user.is_authenticated and user.role in {"superadmin", "admin", "hr"})


def user_agent(user):
    if not user or not user.is_authenticated:
        return None
    return getattr(user, "agent_profile", None)


def agent_belongs_to_user_scope(agent, user):
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
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return is_admin_or_hr(request.user)


class ManagerOwnTeamOnly(BasePermission):
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
