
import logging
import requests
import os 
from django.views.decorators.http import require_GET, require_POST, require_http_methods
from django.http import HttpResponseBadRequest, JsonResponse
from django.contrib import messages
from django.conf import settings
import json
from django.shortcuts import render, redirect
from django.db.models import Count

from .services.databasehandler import DatabaseHandler
from .services.articlerenderer import ArticleRenderer
from .services.search_service import SearchService

logger = logging.getLogger(__name__)
db_handler = DatabaseHandler()

OLLAMA_BASE_URL = settings.OLLAMA_BASE_URL

def ollama_models(request):
    """
    Returns: {"models": ["llama3:latest", "mistral:7b", ...]}
    """
    try:
        r = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        r.raise_for_status()
        data = r.json() or {}
        names = sorted(
            {m.get("name") for m in data.get("models", []) if m.get("name")},
            key=str.lower
        )
        return JsonResponse({"models": list(names)})
    except requests.RequestException as e:
        # Friendly fallback for frontend; you can log e
        return JsonResponse({"models": [], "error": "Ollama unreachable"}, status=503)

@require_GET
def index(request):
    return render(request, 'website/index.html')

def login_view(request):
    return render(request, 'website/login.html')

@require_POST
def search(request):
    user_query = (request.POST.get('user_prompt') or '').strip()
    selected_model = (request.POST.get('model') or '').strip()

    if not user_query:
        return HttpResponseBadRequest("user_prompt is required")

    if not selected_model:
        messages.error(request, "Please select a model before running a search.")
        return redirect('website/index.html')

    request.session['ollama_model'] = selected_model

    search_service = SearchService()
    search_context = search_service.perform_search(user_query, selected_model, request.user)

    return render(request, 'website/search_result.html', {
        **search_context,
        'history_id': None,
    })

@require_GET
def history(request):
    history_records = db_handler.retrieve_search_history_by_user(user_id=request.user.id if request.user.is_authenticated else 1)

    user_prompt_history = [
        {"id": record["id"], "title": record["query"], "folder_id": record["folder_id"], "timestamp": record["timestamp"].isoformat()}
        for record in history_records
    ] if history_records else []

    return JsonResponse(user_prompt_history, safe=False)

@require_GET
def load_history_item(request, id):
    history_item = db_handler.retrieve_search_history_item(history_id=id)
    if not history_item:
        return JsonResponse({'error': 'Not found'}, status=404)

    user_query = history_item['query']
    answer = history_item['answer']
    source_documents = history_item['source_documents']
    chunk_ids = history_item['chunk_ids']

    doc_ids = [doc['metadata']['id'] for doc in source_documents]
    articles = db_handler.retrieve_articles_by_doc_ids(doc_ids)
    articles_as_dict = ArticleRenderer.render_articles_and_contents(
        articles, source_documents, chunk_ids
    )
    
    return render(request, 'website/search_result.html', {
        'query': user_query,
        'answer': answer,
        'articles': articles_as_dict,
        'history_id': id,
    })

@require_http_methods(['DELETE'])
def delete_history(request, id):
    db_handler.delete_search_history_item(history_id=id)
    return JsonResponse({}, status=204)

@require_http_methods(['DELETE'])
def clear_history(request):
    user_id = request.user.id if request.user.is_authenticated else 1
    db_handler.clear_search_history_for_user(user_id=user_id)
    return JsonResponse({}, status=204)


@require_GET
def settings_view(request):
    return render(request, 'website/settings.html')

@require_POST
def save_preferences(request):
    try:
        data = json.loads(request.body)
        default_llm = data.get('default_llm')
        interface_theme = data.get('interface_theme')
        planetary_boundary_interests = data.get('planetary_boundary_interests', [])
    
        print(f"Endpoint /api/preferences/save/ hit!")
        print(f"Received default_llm: {default_llm}")
        print(f"Received interface_theme: {interface_theme}")
        print(f"Selected Planetary Boundaries: {planetary_boundary_interests}")

        # In a real application, you would save these preferences to the user's profile
        # For now, we just log and return a success message.

        return JsonResponse({"message": "Preferences received successfully (not actually saved yet)."})
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON in request body"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

from PB_Assistant.models import SearchFolder, SearchHistory, PlanetaryBoundary

@require_GET
def get_planetary_boundaries(request):
    boundaries = PlanetaryBoundary.objects.all().values('id', 'name', 'short_name')
    return JsonResponse(list(boundaries), safe=False)

@require_POST
def upload_documents(request):
    user_id = request.user.id if request.user.is_authenticated else 1
    upload_dir = os.path.join('upload_test', str(user_id))
    os.makedirs(upload_dir, exist_ok=True)

    boundaries = request.POST.getlist('boundaries[]')
    print("Selected Planetary Boundaries:", boundaries)

    files = request.FILES.getlist('documents')
    if not files:
        return JsonResponse({"error": "No documents provided"}, status=400)

    saved_files = []
    for file in files:
        file_path = os.path.join(upload_dir, file.name)
        with open(file_path, 'wb+') as destination:
            for chunk in file.chunks():
                destination.write(chunk)
        saved_files.append(file.name)

    return JsonResponse({
        "message": f"{len(saved_files)} documents uploaded successfully.",
        "saved_files": saved_files
    })

@require_http_methods(['DELETE'])
def delete_document(request):
    try:
        data = json.loads(request.body)
        filename = data.get('filename')
        
        if not filename:
            return JsonResponse({'error': 'Filename is required'}, status=400)

        user_id = request.user.id if request.user.is_authenticated else 1
        upload_dir = os.path.join('upload_test', str(user_id))
        
        # Sanitize filename to prevent directory traversal
        if '..' in filename or filename.startswith('/'):
            return JsonResponse({'error': 'Invalid filename'}, status=400)

        filepath = os.path.join(upload_dir, filename)

        if os.path.exists(filepath) and os.path.isfile(filepath):
            # Security check: ensure the resolved path is within the user's upload directory
            if os.path.realpath(filepath).startswith(os.path.realpath(upload_dir)):
                os.remove(filepath)
                return JsonResponse({'message': 'Document deleted successfully'}, status=200)
            else:
                return JsonResponse({'error': 'Permission denied'}, status=403)
        else:
            return JsonResponse({'error': 'File not found'}, status=404)

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        return JsonResponse({'error': 'An unexpected error occurred'}, status=500)

@require_GET
def get_folders(request):
    user_id = 1  # Hardcoded for now
    folders = SearchFolder.objects.filter(user_id=user_id).annotate(item_count=Count('searches')).values('id', 'name', 'color', 'item_count')
    return JsonResponse(list(folders), safe=False)

@require_POST
def create_folder(request):
    try:
        data = json.loads(request.body)
        name = data.get('name')
        color = data.get('color', '#6c757d')  # Default color if not provided
        if not name:
            return JsonResponse({'error': 'Name is required'}, status=400)
        
        user_id = 1  # Hardcoded for now

        # Check for existing folder with the same name (case-insensitive) for the same user
        if SearchFolder.objects.filter(name__iexact=name, user_id=user_id).exists():
            return JsonResponse({'error': f'Folder with name "{name}" already exists.'}, status=409)

        folder = SearchFolder.objects.create(name=name, user_id=user_id, color=color)
        return JsonResponse({'id': folder.id, 'name': folder.name, 'color': folder.color}, status=201)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON in request body"}, status=400)

@require_http_methods(['PUT'])
def update_folder(request, folder_id):
    try:
        data = json.loads(request.body)
        name = data.get('name')
        if not name:
            return JsonResponse({'error': 'Name is required'}, status=400)
            
        user_id = 1  # Hardcoded for now
        folder = SearchFolder.objects.get(id=folder_id, user_id=user_id)
        folder.name = name
        folder.save()
        return JsonResponse({'message': 'Folder updated successfully'})
    except SearchFolder.DoesNotExist:
        return JsonResponse({'error': 'Folder not found'}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON in request body"}, status=400)

@require_http_methods(['DELETE'])
def delete_folder(request, folder_id):
    user_id = 1  # Hardcoded for now
    try:
        folder = SearchFolder.objects.get(id=folder_id, user_id=user_id)
        folder.delete()
        return JsonResponse({}, status=204)
    except SearchFolder.DoesNotExist:
        return JsonResponse({'error': 'Folder not found'}, status=404)


from bs4 import BeautifulSoup
from lxml import etree
from email.utils import parsedate_to_datetime
from datetime import datetime
@require_http_methods(['PUT'])
def move_history(request, history_id):
    user_id = 1  # Hardcoded for now
    try:
        data = json.loads(request.body)
        folder_id = data.get('folder_id')

        history_item = SearchHistory.objects.get(id=history_id, user_id=user_id)
        
        if folder_id is None:
            history_item.folder = None
        else:
            folder = SearchFolder.objects.get(id=folder_id, user_id=user_id)
            history_item.folder = folder
            
        history_item.save()
        return JsonResponse({'message': 'Search history moved successfully'})
    except SearchHistory.DoesNotExist:
        return JsonResponse({'error': 'Search history not found'}, status=44)
    except SearchFolder.DoesNotExist:
        return JsonResponse({'error': 'Folder not found'}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON in request body"}, status=400)

@require_GET
def knowledge_library_view(request):
    user_id = request.user.id if request.user.is_authenticated else 1
    upload_dir = os.path.join('upload_test', str(user_id))

    documents = []
    if os.path.exists(upload_dir):
        for filename in os.listdir(upload_dir):
            filepath = os.path.join(upload_dir, filename)
            if os.path.isfile(filepath):
                documents.append({
                    'name': filename,
                    'size': os.path.getsize(filepath),
                    'timestamp': datetime.fromtimestamp(os.path.getmtime(filepath))
                })
    
    # Sort documents by timestamp, newest first
    documents.sort(key=lambda x: x['timestamp'], reverse=True)

    context = {
        'documents': documents
    }
    return render(request, 'website/knowledge_library.html', context)

@require_GET
def rss_feed(request):
    try:
        url = 'https://news.mongabay.com/?feed=custom&s=&post_type=posts&topic=planetary-boundaries'
        response = requests.get(
            url,
            timeout=10,
            headers={
                'User-Agent': 'PB_Assistant/1.0 (+https://example.com)',
                'Accept': 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
            },
        )
        response.raise_for_status()

        parser = etree.XMLParser(recover=True)
        root = etree.fromstring(response.content, parser=parser)
        ns_rdf = {'d': 'http://purl.org/rss/1.0/'}
        ns = {
            'content': 'http://purl.org/rss/1.0/modules/content/',
            'dc': 'http://purl.org/dc/elements/1.1/',
        }
        items = []
        def normalize_date(raw_date):
            if not raw_date:
                return None
            raw_date = raw_date.strip()
            parsed = None
            try:
                parsed = parsedate_to_datetime(raw_date)
            except Exception:
                parsed = None
            if parsed is None:
                try:
                    parsed = datetime.fromisoformat(raw_date.replace('Z', '+00:00'))
                except Exception:
                    return None
            return parsed.date().strftime('%b %d, %Y')

        def clean_text(html_text):
            if not html_text:
                return ''
            soup = BeautifulSoup(html_text, 'html.parser')
            return ' '.join(soup.get_text().split())

        if root.tag.endswith('RDF'):
            item_nodes = root.findall('d:item', namespaces=ns_rdf)
        else:
            channel = root.find('channel') or root.find('.//channel')
            item_nodes = channel.findall('item') if channel is not None else root.findall('.//item')

        for item in item_nodes[:5]:
            title = item.findtext('title') or item.findtext('d:title', namespaces=ns_rdf)
            link = item.findtext('link') or item.findtext('d:link', namespaces=ns_rdf)
            description = (
                item.findtext('content:encoded', namespaces=ns)
                or item.findtext('description')
                or item.findtext('d:description', namespaces=ns_rdf)
            )
            date_raw = (
                item.findtext('pubDate')
                or item.findtext('dc:date', namespaces=ns)
                or item.findtext('d:date', namespaces=ns_rdf)
            )

            plain_text_description = clean_text(description)
            if len(plain_text_description) > 140:
                plain_text_description = plain_text_description[:140].rstrip() + '...'

            if not title or not link:
                continue

            items.append({
                'title': title,
                'link': link,
                'description': plain_text_description,
                'date': normalize_date(date_raw),
                'source': 'Mongabay',
            })
        return JsonResponse(items, safe=False)
    except Exception as e:
        logger.error(f"Error fetching or parsing RSS feed: {e}")
        return JsonResponse({'error': 'Failed to fetch RSS feed'}, status=500)
