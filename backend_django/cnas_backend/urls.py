from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health(_request):
    return JsonResponse({"success": True, "message": "Django API is running"})

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health", health),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/", include("apps.organization.urls")),
    path("api/", include("apps.evaluations.urls")),
]
