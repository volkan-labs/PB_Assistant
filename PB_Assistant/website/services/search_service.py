import time
import logging
from .databasehandler import DatabaseHandler
from .articlerenderer import ArticleRenderer
from .qa_chain import build_llm_chain, build_custom_retrieval_qa_chain, process_qa_response, serialize_documents
from PB_Assistant.apps.textprocessing.embedder import TextEmbedder

logger = logging.getLogger(__name__)

class SearchService:
    def __init__(self):
        self.db_handler = DatabaseHandler()
        self.embedder = TextEmbedder()

    def perform_search(self, user_query, selected_model, user):
        """
        Orchestrates the search process.
        """
        query_vector = self.embedder.embed_text(user_query)
        llm_chain = build_llm_chain(model_name=selected_model)
        qa = build_custom_retrieval_qa_chain(llm_chain, query_vector)

        start_time = time.time()
        response = qa(user_query)
        elapsed_time = time.time() - start_time
        logger.info(f"Time for inference: {elapsed_time:.03f} seconds")

        result = response.get('result', '')
        retrieved_documents = response.get('source_documents', [])

        answer, chunk_ids, doc_ids = process_qa_response(result, retrieved_documents)
        serialized_docs = serialize_documents(retrieved_documents)

        user_id = user.id if user.is_authenticated else 1
        self.db_handler.save_search_history(user_id, user_query, answer, chunk_ids, serialized_docs)

        retrieved_doc_ids = [doc.metadata['id'] for doc in retrieved_documents]
        articles = self.db_handler.retrieve_articles_by_doc_ids(retrieved_doc_ids)
        articles_as_dict = ArticleRenderer.render_articles_and_contents(
            articles, serialized_docs, chunk_ids
        )

        return {
            'query': user_query,
            'answer': answer,
            'articles': articles_as_dict,
        }
