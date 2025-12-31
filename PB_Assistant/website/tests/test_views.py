from django.test import TestCase, Client
from django.urls import reverse
from unittest.mock import patch, MagicMock, ANY
from django.contrib.auth.models import User
from django.conf import settings
import requests

# Mock settings for Ollama_BASE_URL during tests
settings.OLLAMA_BASE_URL = "http://localhost:11434"

class WebsiteViewsTest(TestCase):

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='testuser', password='password')
        self.user_client = Client()
        self.user_client.force_login(self.user)

    def test_index_view_status_code(self):
        """
        Tests that the index view returns a 200 OK status code.
        """
        response = self.client.get(reverse('index'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'website/index.html')

    @patch('PB_Assistant.website.views.requests.get')
    def test_ollama_models_view_success(self, mock_requests_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"models": [{"name": "model1"}, {"name": "model2"}]}
        mock_requests_get.return_value = mock_response

        response = self.client.get(reverse('ollama_models'))
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, {"models": ["model1", "model2"]})
        mock_requests_get.assert_called_once_with(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=5)

    @patch('PB_Assistant.website.views.requests.get')
    def test_ollama_models_view_failure(self, mock_requests_get):
        mock_requests_get.side_effect = requests.exceptions.RequestException("Test connection error")

        response = self.client.get(reverse('ollama_models'))
        self.assertEqual(response.status_code, 503)
        self.assertJSONEqual(response.content, {"models": [], "error": "Ollama unreachable"})
        mock_requests_get.assert_called_once_with(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=5)

    @patch('PB_Assistant.website.views.SearchService')
    @patch('PB_Assistant.website.views.messages.error')
    def test_search_view_post_success(self, mock_messages_error, mock_SearchService):
        mock_search_service_instance = MagicMock()
        mock_search_service_instance.perform_search.return_value = {
            'query': 'test query',
            'answer': 'test answer',
            'articles': [{'title': 'Article 1'}],
        }
        mock_SearchService.return_value = mock_search_service_instance

        response = self.user_client.post(reverse('search'), {
            'user_prompt': 'test query',
            'model': 'test_model'
        })

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'website/search_result.html')
        self.assertIn('query', response.context)
        self.assertEqual(response.context['query'], 'test query')
        self.assertEqual(response.context['answer'], 'test answer')
        mock_SearchService.assert_called_once()
        mock_search_service_instance.perform_search.assert_called_once_with('test query', 'test_model', self.user)
        self.assertFalse(mock_messages_error.called)

    def test_search_view_post_no_user_prompt(self):
        response = self.client.post(reverse('search'), {
            'user_prompt': '',
            'model': 'test_model'
        })
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.content.decode(), "user_prompt is required")

    @patch('PB_Assistant.website.views.messages.error')
    def test_search_view_post_no_model(self, mock_messages_error):
        response = self.client.post(reverse('search'), {
            'user_prompt': 'test query',
            'model': ''
        })
        self.assertEqual(response.status_code, 302) # Redirects to index
        self.assertRedirects(response, reverse('index'))
        mock_messages_error.assert_called_once_with(ANY, "Please select a model before running a search.")

    @patch('PB_Assistant.website.views.db_handler')
    def test_history_view_success(self, mock_db_handler):
        mock_db_handler.retrieve_search_history_by_user.return_value = [
            {'id': 1, 'query': 'query1', 'timestamp': '2023-01-01'},
            {'id': 2, 'query': 'query2', 'timestamp': '2023-01-02'},
        ]

        response = self.user_client.get(reverse('history'))
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, [
            {"id": 1, "title": "query1"},
            {"id": 2, "title": "query2"},
        ])
        mock_db_handler.retrieve_search_history_by_user.assert_called_once_with(user_id=self.user.id)

    @patch('PB_Assistant.website.views.db_handler')
    def test_history_view_no_history(self, mock_db_handler):
        mock_db_handler.retrieve_search_history_by_user.return_value = []

        response = self.user_client.get(reverse('history'))
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, [])
        mock_db_handler.retrieve_search_history_by_user.assert_called_once_with(user_id=self.user.id)

    @patch('PB_Assistant.website.views.ArticleRenderer')
    @patch('PB_Assistant.website.views.db_handler')
    def test_load_history_item_success(self, mock_db_handler, mock_ArticleRenderer):
        history_id = 1
        mock_db_handler.retrieve_search_history_item.return_value = {
            'query': 'history query',
            'answer': 'history answer',
            'source_documents': [{'metadata': {'id': 'doc1_uuid'}}],
            'chunk_ids': ['chunk1_id']
        }
        mock_db_handler.retrieve_articles_by_doc_ids.return_value = ['mock_article_obj']
        mock_ArticleRenderer.render_articles_and_contents.return_value = ['rendered_article_dict']

        response = self.user_client.get(reverse('load_history_item', args=[history_id]))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'website/search_result.html')
        self.assertEqual(response.context['query'], 'history query')
        self.assertEqual(response.context['answer'], 'history answer')
        self.assertEqual(response.context['articles'], ['rendered_article_dict'])
        self.assertEqual(response.context['history_id'], history_id)

        mock_db_handler.retrieve_search_history_item.assert_called_once_with(history_id=history_id)
        mock_db_handler.retrieve_articles_by_doc_ids.assert_called_once_with(['doc1_uuid'])
        mock_ArticleRenderer.render_articles_and_contents.assert_called_once_with(['mock_article_obj'], [{'metadata': {'id': 'doc1_uuid'}}], ['chunk1_id'])

    @patch('PB_Assistant.website.views.db_handler')
    def test_load_history_item_not_found(self, mock_db_handler):
        history_id = 99
        mock_db_handler.retrieve_search_history_item.return_value = None

        response = self.user_client.get(reverse('load_history_item', args=[history_id]))
        self.assertEqual(response.status_code, 404)
        self.assertJSONEqual(response.content, {'error': 'Not found'})
        mock_db_handler.retrieve_search_history_item.assert_called_once_with(history_id=history_id)

    @patch('PB_Assistant.website.views.db_handler')
    def test_delete_history_success(self, mock_db_handler):
        history_id = 1
        response = self.user_client.delete(reverse('delete_history', args=[history_id]))
        self.assertEqual(response.status_code, 204)
        mock_db_handler.delete_search_history_item.assert_called_once_with(history_id=history_id)

    @patch('PB_Assistant.website.views.db_handler')
    def test_clear_history_success(self, mock_db_handler):
        response = self.user_client.delete(reverse('clear_history'))
        self.assertEqual(response.status_code, 204)
        mock_db_handler.clear_search_history_for_user.assert_called_once_with(user_id=self.user.id)

    @patch('PB_Assistant.website.views.db_handler')
    def test_clear_history_unauthenticated_user(self, mock_db_handler):
        # Test with an unauthenticated client
        response = self.client.delete(reverse('clear_history'))
        self.assertEqual(response.status_code, 204)
        # Assuming unauthenticated user defaults to user_id=1
        mock_db_handler.clear_search_history_for_user.assert_called_once_with(user_id=1)