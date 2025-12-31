
import httpx # New import
import logging
import requests
from django.views.decorators.http import require_GET, require_POST, require_http_methods
from django.http import HttpResponseBadRequest, JsonResponse
from django.contrib import messages
from django.conf import settings
from django.shortcuts import render, redirect
from asgiref.sync import sync_to_async

from .services.databasehandler import DatabaseHandler
from .services.articlerenderer import ArticleRenderer
from .services.search_service import SearchService

logger = logging.getLogger(__name__)
db_handler = DatabaseHandler()

OLLAMA_BASE_URL = settings.OLLAMA_BASE_URL

async def ollama_models(request):
    """
    Returns: {"models": ["llama3:latest", "mistral:7b", ...]}
    """
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        r.raise_for_status()
        data = r.json() or {}
        names = sorted(
            {m.get("name") for m in data.get("models", []) if m.get("name")},
            key=str.lower
        )
        return JsonResponse({"models": list(names)})
    except httpx.RequestError as e:
        # Friendly fallback for frontend; you can log e
        return JsonResponse({"models": [], "error": "Ollama unreachable"}, status=503)

@require_GET
def index(request):
    return render(request, 'website/index.html')

@require_POST
async def search(request):
    user_query = (request.POST.get('user_prompt') or '').strip()
    selected_model = (request.POST.get('model') or '').strip()

    if not user_query:
        return HttpResponseBadRequest("user_prompt is required")

    if not selected_model:
        messages.error(request, "Please select a model before running a search.")
        return await sync_to_async(redirect, thread_sensitive=True)('website/index.html')

    await sync_to_async(lambda: request.session.update({'ollama_model': selected_model}), thread_sensitive=True)()

    search_service = SearchService()
    search_context = await sync_to_async(search_service.perform_search)(user_query, selected_model, request.user)

    return await sync_to_async(render, thread_sensitive=True)(request, 'website/search_result.html', {
        **search_context,
        'history_id': None,
    })

OLLAMA_BASE_URL = settings.OLLAMA_BASE_URL

async def get_user_id_async(request):
    return await sync_to_async(lambda: request.user.id if request.user.is_authenticated else 1, thread_sensitive=True)()

@require_GET
async def history(request):
    user_id = await get_user_id_async(request)
    history_records = await sync_to_async(db_handler.retrieve_search_history_by_user, thread_sensitive=True)(user_id=user_id)

    user_prompt_history = [
        {"id": record["id"], "title": record["query"]}
        for record in history_records
    ] if history_records else []

    return JsonResponse(user_prompt_history, safe=False)

@require_GET
async def load_history_item(request, id):
    history_item = await sync_to_async(db_handler.retrieve_search_history_item, thread_sensitive=True)(history_id=id)
    if not history_item:
        return JsonResponse({'error': 'Not found'}, status=404)

    user_query = history_item['query']
    answer = history_item['answer']
    source_documents = history_item['source_documents']
    chunk_ids = history_item['chunk_ids']

    doc_ids = [doc['metadata']['id'] for doc in source_documents]
    articles = await sync_to_async(db_handler.retrieve_articles_by_doc_ids, thread_sensitive=True)(doc_ids)
    articles_as_dict = await sync_to_async(ArticleRenderer.render_articles_and_contents, thread_sensitive=True)(
        articles, source_documents, chunk_ids
    )
    
    return await sync_to_async(render, thread_sensitive=True)(request, 'website/search_result.html', {
        'query': user_query,
        'answer': answer,
        'articles': articles_as_dict,
        'history_id': id,
    })

@require_http_methods(['DELETE'])
async def delete_history(request, id):
    await sync_to_async(db_handler.delete_search_history_item, thread_sensitive=True)(history_id=id)
    return JsonResponse({}, status=204)

@require_http_methods(['DELETE'])
async def clear_history(request):
    user_id = await get_user_id_async(request)
    await sync_to_async(db_handler.clear_search_history_for_user, thread_sensitive=True)(user_id=user_id)
    return JsonResponse({}, status=204)
