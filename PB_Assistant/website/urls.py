from . import views

from django.urls import path

urlpatterns = [
    path('', views.index, name='index'),
    path('search/', views.search, name='search'),
    path('history/', views.history, name='history'),
    path('history-item/<int:id>', views.load_history_item, name='load_history_item'),
    path('delete-history/<int:id>', views.delete_history, name='delete_history'),
    path('history/clear/', views.clear_history, name='clear_history'),
    path("api/ollama/models/", views.ollama_models, name="ollama_models"),
    path('settings/', views.settings_view, name='settings'),
]
