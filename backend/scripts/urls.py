"""
URL routing for the scripts API.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views
from . import auth

router = DefaultRouter()
router.register(r"scripts", views.ScriptViewSet, basename="script")

urlpatterns = [
    path("", include(router.urls)),
    path("auth/register/", auth.RegisterView.as_view(), name="auth_register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("scripts/search/", views.search_scripts, name="script-search"),
    # Nested scene routes
    path(
        "scripts/<uuid:script_pk>/scenes/",
        views.SceneViewSet.as_view({"get": "list", "post": "create"}),
        name="scene-list",
    ),
    path(
        "scripts/<uuid:script_pk>/scenes/<uuid:pk>/",
        views.SceneViewSet.as_view({"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}),
        name="scene-detail",
    ),
    # Nested element routes
    path(
        "scripts/<uuid:script_pk>/scenes/<uuid:scene_pk>/elements/",
        views.ElementViewSet.as_view({"get": "list", "post": "create"}),
        name="element-list",
    ),
    path(
        "scripts/<uuid:script_pk>/scenes/<uuid:scene_pk>/elements/<uuid:pk>/",
        views.ElementViewSet.as_view({"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}),
        name="element-detail",
    ),
]
