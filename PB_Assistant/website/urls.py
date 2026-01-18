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
    path("api/ollama/models/", views.ollama_models, name="ollama_models"),
    path("api/preferences/save/", views.save_preferences, name="save_preferences"),
    path("api/documents/upload/", views.upload_documents, name="upload_documents"),
    path('settings/', views.settings_view, name='settings'),
]
