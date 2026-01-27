from . import views

from django.urls import path

urlpatterns = [
    path('', views.login_view, name='login'),
    path('index/', views.index, name='index'),
    path('search/', views.search, name='search'),
    path('history/', views.history, name='history'),
    path('history-item/<int:id>', views.load_history_item, name='load_history_item'),
    path('delete-history/<int:id>', views.delete_history, name='delete_history'),
    path('history/clear/', views.clear_history, name='clear_history'),
    path('api/ollama/models/', views.ollama_models, name="ollama_models"),
    path('api/planetary-boundaries/', views.get_planetary_boundaries, name="get_planetary_boundaries"),
    path("api/preferences/save/", views.save_preferences, name="save_preferences"),
    path("api/documents/upload/", views.upload_documents, name="upload_documents"),
    path("api/documents/delete/", views.delete_document, name='delete_document'),
    path('api/folders/', views.get_folders, name='get_folders'),
    path('api/folders/create/', views.create_folder, name='create_folder'),
    path('api/folders/<int:folder_id>/update/', views.update_folder, name='update_folder'),
    path('api/folders/<int:folder_id>/delete/', views.delete_folder, name='delete_folder'),
    path('api/history/<int:history_id>/move/', views.move_history, name='move_history'),
    path('api/rss-feed/', views.rss_feed, name='rss_feed'),
    path('knowledge-library/', views.knowledge_library_view, name='knowledge_library'),
    path('settings/', views.settings_view, name='settings'),
]
