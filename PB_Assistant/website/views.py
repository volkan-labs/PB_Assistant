
import logging
import requests
import os 
from django.views.decorators.http import require_GET, require_POST, require_http_methods
from django.http import HttpResponseBadRequest, JsonResponse
from django.contrib import messages
from django.conf import settings
import json
from django.utils import timezone
from datetime import timedelta
from django.shortcuts import render, redirect
from django.db.models import Count
from django.db import models
from django.contrib.auth.models import User

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

    if 'query_timestamp' not in search_context:
        search_context['query_timestamp'] = timezone.now()
    if 'answer_timestamp' not in search_context:
        search_context['answer_timestamp'] = search_context['query_timestamp']

    articles = search_context.get('articles') or []
    answer = search_context.get('answer') or ''
    if not articles and 'answer is not available in the documents' in answer.lower():
        search_context['answer'] = ''

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
    
    if not articles_as_dict and answer and 'answer is not available in the documents' in answer.lower():
        answer = ''

    return render(request, 'website/search_result.html', {
        'query': user_query,
        'answer': answer,
        'articles': articles_as_dict,
        'history_id': id,
        'query_timestamp': history_item.get('timestamp'),
        'answer_timestamp': history_item.get('timestamp'),
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

@require_GET
def alerts_view(request):
    return render(request, 'website/alerts.html')

@require_GET
def notifications_view(request):
    return render(request, 'website/notifications.html')

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

        user = _resolve_user(request)
        settings_obj = _get_or_create_settings(user)
        if settings_obj:
            if interface_theme in ('light', 'dark', 'system'):
                settings_obj.theme = interface_theme
            if default_llm is not None:
                settings_obj.default_llm_model = default_llm
            if isinstance(planetary_boundary_interests, list):
                boundaries = PlanetaryBoundary.objects.filter(id__in=planetary_boundary_interests)
                settings_obj.planetary_boundaries.set(boundaries)
            settings_obj.save()

        return JsonResponse({"message": "Preferences saved successfully."})
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON in request body"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

from PB_Assistant.models import SearchFolder, SearchHistory, PlanetaryBoundary, UserSettings, NotificationCategory, SystemNotification, NotificationUserState
from PB_Assistant.models import AcademicPaperText, AcademicPaperPlanetaryBoundary

def _resolve_user(request):
    if request.user and request.user.is_authenticated:
        return request.user
    try:
        return User.objects.get(pk=1)
    except User.DoesNotExist:
        user = User.objects.first()
        if user:
            return user
        return User.objects.create(username='local-user')

def _get_or_create_settings(user):
    if not user:
        return None
    settings_obj, _ = UserSettings.objects.get_or_create(user=user)
    return settings_obj

@require_GET
def get_planetary_boundaries(request):
    boundaries = PlanetaryBoundary.objects.all().values('id', 'name', 'short_name')
    return JsonResponse(list(boundaries), safe=False)

@require_GET
def get_user_settings(request):
    user = _resolve_user(request)
    settings_obj = _get_or_create_settings(user)
    if not settings_obj:
        return JsonResponse({
            'theme': 'system',
            'default_llm_model': '',
            'ui_collapse_navigation': False,
            'ui_collapse_insights': False,
            'planetary_boundaries': []
        })
    return JsonResponse({
        'theme': settings_obj.theme,
        'default_llm_model': settings_obj.default_llm_model,
        'ui_collapse_navigation': settings_obj.ui_collapse_navigation,
        'ui_collapse_insights': settings_obj.ui_collapse_insights,
        'planetary_boundaries': list(settings_obj.planetary_boundaries.values_list('id', flat=True)),
        'avatar_color': settings_obj.avatar_color,
    })

@require_http_methods(['PUT'])
def update_theme(request):
    user = _resolve_user(request)
    settings_obj = _get_or_create_settings(user)
    if not settings_obj:
        return JsonResponse({'error': 'User not found'}, status=404)
    try:
        data = json.loads(request.body)
        theme = data.get('theme')
        if theme not in ('light', 'dark', 'system'):
            return JsonResponse({'error': 'Invalid theme'}, status=400)
        settings_obj.theme = theme
        settings_obj.save()
        return JsonResponse({'theme': settings_obj.theme})
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

@require_http_methods(['PUT'])
def update_default_llm(request):
    user = _resolve_user(request)
    settings_obj = _get_or_create_settings(user)
    if not settings_obj:
        return JsonResponse({'error': 'User not found'}, status=404)
    try:
        data = json.loads(request.body)
        model = data.get('default_llm_model', '')
        settings_obj.default_llm_model = model
        settings_obj.save()
        return JsonResponse({'default_llm_model': settings_obj.default_llm_model})
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

@require_http_methods(['PUT'])
def update_ui_behavior(request):
    user = _resolve_user(request)
    settings_obj = _get_or_create_settings(user)
    if not settings_obj:
        return JsonResponse({'error': 'User not found'}, status=404)
    try:
        data = json.loads(request.body)
        if 'ui_collapse_navigation' in data:
            settings_obj.ui_collapse_navigation = bool(data.get('ui_collapse_navigation'))
        if 'ui_collapse_insights' in data:
            settings_obj.ui_collapse_insights = bool(data.get('ui_collapse_insights'))
        settings_obj.save()
        return JsonResponse({
            'ui_collapse_navigation': settings_obj.ui_collapse_navigation,
            'ui_collapse_insights': settings_obj.ui_collapse_insights
        })
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

@require_http_methods(['PUT'])
def update_boundary_preferences(request):
    user = _resolve_user(request)
    settings_obj = _get_or_create_settings(user)
    if not settings_obj:
        return JsonResponse({'error': 'User not found'}, status=404)
    try:
        data = json.loads(request.body)
        boundary_ids = data.get('boundary_ids', [])
        if not isinstance(boundary_ids, list):
            return JsonResponse({'error': 'boundary_ids must be a list'}, status=400)
        boundaries = PlanetaryBoundary.objects.filter(id__in=boundary_ids)
        settings_obj.planetary_boundaries.set(boundaries)
        settings_obj.save()
        return JsonResponse({'planetary_boundaries': list(settings_obj.planetary_boundaries.values_list('id', flat=True))})
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

@require_http_methods(['PUT'])
def update_avatar_color(request):
    user = _resolve_user(request)
    settings_obj = _get_or_create_settings(user)
    if not settings_obj:
        return JsonResponse({'error': 'User not found'}, status=404)
    try:
        data = json.loads(request.body)
        color = data.get('avatar_color')
        if not color:
            return JsonResponse({'error': 'avatar_color required'}, status=400)
        settings_obj.avatar_color = color
        settings_obj.save()
        return JsonResponse({'avatar_color': settings_obj.avatar_color})
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

@require_GET
def get_notifications(request):
    user = _resolve_user(request)
    settings_user = user
    days = request.GET.get('days', '7')
    page = int(request.GET.get('page', '1'))
    page_size = int(request.GET.get('page_size', '10'))
    try:
        days_int = min(30, max(1, int(days)))
    except ValueError:
        days_int = 7

    now = timezone.now()
    local_now = timezone.localtime(now)
    if days_int == 1:
        notifications = SystemNotification.objects.filter(
            published_at__date=local_now.date()
        )
    else:
        since = now - timedelta(days=days_int)
        notifications = SystemNotification.objects.filter(
            published_at__gte=since,
            published_at__lte=now
        )

    notifications = notifications.filter(
        models.Q(expires_at__isnull=True) | models.Q(expires_at__gte=now)
    ).select_related('category').order_by('-published_at')

    total = notifications.count()
    total_pages = max(1, (total + page_size - 1) // page_size)
    page = max(1, min(page, total_pages))
    start = (page - 1) * page_size
    items = notifications[start:start + page_size]

    states = {}
    if settings_user:
        states = {
            s.notification_id: s
            for s in NotificationUserState.objects.filter(user=settings_user, notification__in=items)
        }

    payload = []
    for n in items:
        state = states.get(n.id)
        payload.append({
            'id': n.id,
            'title': n.title,
            'body': n.body,
            'category': {
                'id': n.category_id,
                'name': n.category.name,
                'slug': n.category.slug
            },
            'priority': n.priority,
            'published_at': n.published_at.isoformat(),
            'expires_at': n.expires_at.isoformat() if n.expires_at else None,
            'read': bool(state and state.read_at),
            'dismissed': bool(state and state.dismissed_at),
        })

    categories = list(NotificationCategory.objects.all().values('id', 'name', 'slug'))

    return JsonResponse({
        'categories': categories,
        'notifications': payload,
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total': total,
            'total_pages': total_pages
        }
    })

@require_http_methods(['PUT'])
def update_notification_state(request, notification_id):
    user = _resolve_user(request)
    if not user:
        return JsonResponse({'error': 'User not found'}, status=404)
    try:
        data = json.loads(request.body)
        mark_read = data.get('read')
        dismiss = data.get('dismiss')
        notification = SystemNotification.objects.get(pk=notification_id)
        state, _ = NotificationUserState.objects.get_or_create(user=user, notification=notification)
        now = timezone.now()
        if mark_read is True:
            state.read_at = now
        if mark_read is False:
            state.read_at = None
        if dismiss is True:
            state.dismissed_at = now
        if dismiss is False:
            state.dismissed_at = None
        state.save()
        return JsonResponse({
            'id': notification_id,
            'read': bool(state.read_at),
            'dismissed': bool(state.dismissed_at)
        })
    except SystemNotification.DoesNotExist:
        return JsonResponse({'error': 'Notification not found'}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

@require_http_methods(['POST'])
def create_notification(request):
    user = _resolve_user(request)
    # TODO: Restrict to superuser once auth is fully wired.
    if not user:
        return JsonResponse({'error': 'Forbidden'}, status=403)
    try:
        data = json.loads(request.body)
        title = (data.get('title') or '').strip()
        body = (data.get('body') or '').strip()
        category_id = data.get('category_id')
        priority = data.get('priority', 'normal')
        published_at = data.get('published_at')
        expires_at = data.get('expires_at')

        if not title or not body or not category_id:
            return JsonResponse({'error': 'Missing required fields'}, status=400)

        category = NotificationCategory.objects.get(pk=category_id)
        if priority not in dict(SystemNotification.PRIORITY_CHOICES):
            priority = 'normal'

        published_dt = timezone.now()
        if published_at:
            try:
                published_dt = timezone.datetime.fromisoformat(published_at)
                if timezone.is_naive(published_dt):
                    published_dt = timezone.make_aware(published_dt)
            except ValueError:
                return JsonResponse({'error': 'Invalid publish date'}, status=400)

        expires_dt = None
        if expires_at:
            try:
                expires_dt = timezone.datetime.fromisoformat(expires_at)
                if timezone.is_naive(expires_dt):
                    expires_dt = timezone.make_aware(expires_dt)
            except ValueError:
                return JsonResponse({'error': 'Invalid expiry date'}, status=400)

        notif = SystemNotification.objects.create(
            title=title,
            body=body,
            category=category,
            priority=priority,
            published_at=published_dt,
            expires_at=expires_dt
        )

        return JsonResponse({'id': notif.id})
    except NotificationCategory.DoesNotExist:
        return JsonResponse({'error': 'Invalid category'}, status=400)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

@require_GET
def get_knowledge_documents(request):
    query = (request.GET.get('q') or '').strip()
    boundary = (request.GET.get('boundary') or '').strip()
    if boundary == 'all':
        boundary = ''
    page = int(request.GET.get('page', '1'))
    page_size = int(request.GET.get('page_size', '10'))

    papers = (
        AcademicPaperText.objects
        .select_related('academicpaper')
        .prefetch_related('academicpaper__planetary_boundary')
        .all()
    )

    if boundary:
        if boundary.isdigit():
            papers = papers.filter(academicpaper__planetary_boundary__id=int(boundary))
        else:
            papers = papers.filter(academicpaper__planetary_boundary__name=boundary)

    if query:
        papers = papers.filter(
            models.Q(academicpaper__title__icontains=query) |
            models.Q(text__icontains=query) |
            models.Q(academicpaper__author_list__icontains=query)
        )

    papers = papers.distinct()

    total = papers.count()
    total_pages = max(1, (total + page_size - 1) // page_size)
    page = max(1, min(page, total_pages))
    start = (page - 1) * page_size
    items = list(papers[start:start + page_size])

    results = []
    for paper_text in items:
        paper = paper_text.academicpaper
        if not paper:
            continue
        boundaries = list(paper.planetary_boundary.values_list('name', flat=True))
        boundary_label = ', '.join(boundaries) if boundaries else ''
        authors_list = []
        if isinstance(paper.author_list, list):
            for author in paper.author_list:
                if isinstance(author, dict):
                    name = author.get('name') or author.get('full_name') or author.get('author') or ''
                    if name:
                        authors_list.append(name)
                elif isinstance(author, str):
                    authors_list.append(author)
        if query:
            q = query.lower()
            title_match = (paper.title or '').lower().find(q) != -1
            abstract_match = (paper_text.text or '').lower().find(q) != -1
            author_match = any(q in (a or '').lower() for a in authors_list)
            if not (title_match or abstract_match or author_match):
                continue
        if len(authors_list) > 4:
            authors_short = ', '.join(authors_list[:4]) + f" +{len(authors_list) - 4} more"
        else:
            authors_short = ', '.join(authors_list)
        results.append({
            'id': str(paper_text.id),
            'title': paper.title or '',
            'abstract': paper_text.text or '',
            'authors': authors_short,
            'authors_full': ', '.join(authors_list),
            'planetaryBoundary': boundary_label,
            'source': paper.source or 'fetched',
        })

    return JsonResponse({
        'documents': results,
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total': total,
            'total_pages': total_pages
        }
    })

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
