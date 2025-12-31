from django.test import TestCase
from unittest.mock import patch, MagicMock, ANY
from PB_Assistant.website.services.search_service import SearchService
from PB_Assistant.website.services.databasehandler import DatabaseHandler
from PB_Assistant.apps.textprocessing.embedder import TextEmbedder
from PB_Assistant.website.services import qa_chain  # Import the module to patch its functions
from django.contrib.auth.models import User

class SearchServiceTest(TestCase):

    def setUp(self):
        # Initialize instances of services
        self.db_handler = DatabaseHandler()
        self.embedder = TextEmbedder()
        self.search_service = SearchService()
        self.user = User.objects.create_user(username='testuser', email='test@example.com', password='password')


    @patch('PB_Assistant.website.services.databasehandler.DatabaseHandler.save_search_history')
    @patch('PB_Assistant.website.services.search_service.process_qa_response')
    @patch('PB_Assistant.website.services.search_service.build_custom_retrieval_qa_chain')
    @patch('PB_Assistant.website.services.search_service.build_llm_chain')
    @patch('PB_Assistant.apps.textprocessing.embedder.TextEmbedder.embed_text')
    def test_perform_search_success(self, mock_embed_text, mock_build_llm_chain, mock_build_custom_retrieval_qa_chain, mock_process_qa_response, mock_save_search_history):
        user_prompt = "test user prompt"
        selected_model = "test_model"
        
        mock_embed_text.return_value = [0.1, 0.2, 0.3] # Mock embedding vector

        mock_llm_chain_instance = MagicMock()
        mock_build_llm_chain.return_value = mock_llm_chain_instance

        mock_qa_instance = MagicMock()
        mock_qa_instance.return_value = {
            'result': 'test result from llm',
            'source_documents': [MagicMock(metadata={'id': 1, 'chunk_id': '1:0'})]
        }
        mock_build_custom_retrieval_qa_chain.return_value = mock_qa_instance
        
        mock_process_qa_response.return_value = ("test answer", ["1:0"], [1])
        mock_save_search_history.return_value = None

        result = self.search_service.perform_search(user_prompt, selected_model, self.user)

        self.assertIsNotNone(result)
        self.assertEqual(result.get("answer"), "test answer")
        self.assertEqual(result.get("query"), user_prompt)

        mock_embed_text.assert_called_once_with(user_prompt)
        mock_build_llm_chain.assert_called_once_with(model_name=selected_model)
        mock_build_custom_retrieval_qa_chain.assert_called_once_with(mock_llm_chain_instance, mock_embed_text.return_value)
        mock_qa_instance.assert_called_once_with(user_prompt)
        mock_process_qa_response.assert_called_once()
        mock_save_search_history.assert_called_once()

    @patch('PB_Assistant.website.services.search_service.build_llm_chain') # Add this patch
    @patch('PB_Assistant.apps.textprocessing.embedder.TextEmbedder.embed_text')
    def test_perform_search_no_llm_model(self, mock_embed_text, mock_build_llm_chain): # Add mock_build_llm_chain parameter
        user_prompt = "test user prompt"
        selected_model = None # Simulating no model selected
        
        mock_embed_text.return_value = [0.1, 0.2, 0.3]
        mock_build_llm_chain.return_value = None # Ensure build_llm_chain returns None if model is invalid

        result = self.search_service.perform_search(user_prompt, selected_model, self.user)

        self.assertIsNone(result)
        mock_embed_text.assert_called_once_with(user_prompt)
        mock_build_llm_chain.assert_called_once_with(model_name=selected_model) # Assert it was called

    @patch('PB_Assistant.website.services.databasehandler.DatabaseHandler.save_search_history')
    @patch('PB_Assistant.website.services.search_service.process_qa_response')
    @patch('PB_Assistant.website.services.search_service.build_custom_retrieval_qa_chain')
    @patch('PB_Assistant.website.services.search_service.build_llm_chain')
    @patch('PB_Assistant.apps.textprocessing.embedder.TextEmbedder.embed_text')
    def test_perform_search_llm_returns_no_result(self, mock_embed_text, mock_build_llm_chain, mock_build_custom_retrieval_qa_chain, mock_process_qa_response, mock_save_search_history):
        user_prompt = "test user prompt"
        selected_model = "test_model"
        
        mock_embed_text.return_value = [0.1, 0.2, 0.3]

        mock_llm_chain_instance = MagicMock()
        mock_build_llm_chain.return_value = mock_llm_chain_instance

        mock_qa_instance = MagicMock()
        mock_qa_instance.return_value = {'result': None, 'source_documents': []} # Simulate LLM returning no result
        mock_build_custom_retrieval_qa_chain.return_value = mock_qa_instance
        
        mock_process_qa_response.return_value = ("The answer is not available in the documents.", [], [])
        mock_save_search_history.return_value = None

        result = self.search_service.perform_search(user_prompt, selected_model, self.user)

        self.assertIsNotNone(result)
        self.assertEqual(result.get("answer"), "The answer is not available in the documents.")
        mock_embed_text.assert_called_once_with(user_prompt)
        mock_build_llm_chain.assert_called_once_with(model_name=selected_model)
        mock_build_custom_retrieval_qa_chain.assert_called_once_with(mock_llm_chain_instance, mock_embed_text.return_value)
        mock_qa_instance.assert_called_once_with(user_prompt)
        mock_process_qa_response.assert_called_once()
        mock_save_search_history.assert_called_once()