"""
URL routing for the scripts API.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views, auth

router = DefaultRouter()
router.register(r"scripts", views.ScriptViewSet, basename="script")

urlpatterns = [
    path("", include(router.urls)),
    path("auth/register/", auth.RegisterView.as_view(), name="auth_register"),
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
    # Workspace / canvas snapshot export endpoints
    path("export/workspace-pdf/", views.export_workspace_pdf, name="export-workspace-pdf"),
    path("export/storyboard-pdf/", views.export_storyboard_pdf, name="export-storyboard-pdf"),
    # Storyboard endpoints
    path("storyboards/<uuid:script_pk>/", views.StoryboardViewSet.as_view({"get": "retrieve", "patch": "partial_update"}), name="storyboard"),
    path("storyboards/<uuid:storyboard_pk>/cards/", views.SceneCardViewSet.as_view({"get": "list", "post": "create"}), name="scenecard-list"),
    path("storyboards/<uuid:storyboard_pk>/cards/reorder/", views.SceneCardViewSet.as_view({"post": "reorder"}), name="scenecard-reorder"),
    path("storyboards/<uuid:storyboard_pk>/cards/bulk_delete/", views.SceneCardViewSet.as_view({"delete": "bulk_delete"}), name="scenecard-bulk-delete"),
    path("storyboards/<uuid:storyboard_pk>/cards/<uuid:pk>/", views.SceneCardViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}), name="scenecard-detail"),
]
