"""Vue d'ensemble du fichier : urls.py
Role : declaration des routes backend pour exposer les endpoints du module.
Module : module comptes et acces.
Ce commentaire sert de repere rapide pour comprendre ou intervenir pendant la soutenance.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.views import CurrentUserView, RegisterView, CustomTokenObtainPairView, UserViewSet


router = DefaultRouter(trailing_slash=False)
router.register("users", UserViewSet, basename="users")


urlpatterns = [
    path("login", CustomTokenObtainPairView.as_view(), name="login"),
    path("refresh", TokenRefreshView.as_view(), name="refresh"),
    path("register", RegisterView.as_view(), name="register"),
    path("me", CurrentUserView.as_view(), name="me"),
    path("", include(router.urls)),
]


