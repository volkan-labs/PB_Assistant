from django.test import TestCase
from unittest.mock import patch, MagicMock
from PB_Assistant.website.services.databasehandler import DatabaseHandler
from PB_Assistant.models import SearchHistory, AcademicPaper, AcademicPaperTextEmbedding, AcademicPaperText
from django.contrib.auth.models import User
from pgvector.django import CosineDistance
import uuid

class DatabaseHandlerTest(TestCase):

    def setUp(self):
        self.db_handler = DatabaseHandler()
        self.user = User.objects.create_user(username='testuser', email='test@example.com', password='password')
        self.user2 = User.objects.create_user(username='testuser2', email='test2@example.com', password='password')

        # Create some dummy AcademicPaper instances
        self.paper1 = AcademicPaper.objects.create(
            paper_id=uuid.uuid4(), title="Title 1", author_list=[{"name": "Author A"}], source="Journal X", publication_year=2020
        )
        self.paper2 = AcademicPaper.objects.create(
            paper_id=uuid.uuid4(), title="Title 2", author_list=[{"name": "Author B"}], source="Journal Y", publication_year=2021
        )
        
        # Create AcademicPaperText instances
        self.paper1_text = AcademicPaperText.objects.create(academicpaper=self.paper1, text="Full text of paper 1.", hasfulltext=True)
        self.paper2_text = AcademicPaperText.objects.create(academicpaper=self.paper2, text="Full text of paper 2.", hasfulltext=True)

        # Create some dummy AcademicPaperTextEmbedding instances
        self.embedding1 = AcademicPaperTextEmbedding.objects.create(
            academicpaper_text=self.paper1_text, content="content 1.1", chunk_index=0, vector=[0.0] * 768
        )
        self.embedding2 = AcademicPaperTextEmbedding.objects.create(
            academicpaper_text=self.paper1_text, content="content 1.2", chunk_index=1, vector=[0.0] * 768
        )
        self.embedding3 = AcademicPaperTextEmbedding.objects.create(
            academicpaper_text=self.paper2_text, content="content 2.1", chunk_index=0, vector=[0.0] * 768
        )

    def test_save_search_history(self):
        user_id = self.user.id
        user_query = "Test query"
        answer = "Test answer"
        chunk_ids = [f"{self.paper1.paper_id}:0", f"{self.paper1.paper_id}:1"]
        retrieved_documents = [
            {"page_content": "content 1.1", "metadata": {"id": str(self.paper1.paper_id), "chunk_id": f"{self.paper1.paper_id}:0"}},
            {"page_content": "content 1.2", "metadata": {"id": str(self.paper1.paper_id), "chunk_id": f"{self.paper1.paper_id}:1"}},
        ]

        self.db_handler.save_search_history(user_id, user_query, answer, chunk_ids, retrieved_documents)

        # Verify SearchHistory object was created
        search_query = SearchHistory.objects.get(user_id=self.user.id, query=user_query)
        self.assertIsNotNone(search_query)
        self.assertEqual(search_query.answer, answer)
        self.assertEqual(search_query.chunk_ids, chunk_ids)

    def test_clear_search_history_for_user(self):
        # Create some search history for testuser
        SearchHistory.objects.create(user_id=self.user.id, query="Query 1", answer="Answer 1")
        SearchHistory.objects.create(user_id=self.user.id, query="Query 2", answer="Answer 2")
        # Create history for another user to ensure it's not deleted
        SearchHistory.objects.create(user_id=self.user2.id, query="Query 3", answer="Answer 3")

        self.assertEqual(SearchHistory.objects.filter(user_id=self.user.id).count(), 2)
        self.assertEqual(SearchHistory.objects.filter(user_id=self.user2.id).count(), 1)

        self.db_handler.clear_search_history_for_user(self.user.id)

        self.assertEqual(SearchHistory.objects.filter(user_id=self.user.id).count(), 0)
        self.assertEqual(SearchHistory.objects.filter(user_id=self.user2.id).count(), 1)

    def test_retrieve_articles_by_doc_ids(self):
        doc_ids = [str(self.paper1.paper_id), str(self.paper2.paper_id)]
        articles = self.db_handler.retrieve_articles_by_doc_ids(doc_ids)

        self.assertEqual(len(articles), 2)
        self.assertIn(self.paper1, articles)
        self.assertIn(self.paper2, articles)

    def test_retrieve_articles_by_doc_ids_empty(self):
        doc_ids = []
        articles = self.db_handler.retrieve_articles_by_doc_ids(doc_ids)
        self.assertEqual(len(articles), 0)

    def test_retrieve_articles_by_doc_ids_non_existent(self):
        doc_ids = [str(uuid.uuid4())]
        articles = self.db_handler.retrieve_articles_by_doc_ids(doc_ids)
        self.assertEqual(len(articles), 0)

    # Note: embed_text and get_similar_embeddings are part of TextEmbedder, not DatabaseHandler
    # They would be tested in test_embedder.py if needed, or mocked here.