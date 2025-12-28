from django.forms.models import model_to_dict
from PB_Assistant.models import SearchHistory, AcademicPaper, AcademicPaperText
import logging
logger = logging.getLogger(__name__)

class DatabaseHandler:

    def retrieve_articles_by_doc_ids(self, doc_ids):
        try:
            academicpapers = AcademicPaper.objects.filter(academicpaper_text__id__in=doc_ids).distinct()
            results = []
            for academicpaper in academicpapers:
                article_dict = model_to_dict(academicpaper)
                article_dict['academicpaper_text_id'] = academicpaper.academicpaper_text.id if academicpaper.academicpaper_text else None
                article_dict['authors_string'] = ", ".join(a.get("name", "") for a in academicpaper.author_list if a.get("name"))
                results.append(article_dict)
            return results
        except Exception as e:
            logger.error(f"Error fetching articles: {e}")
            return []

    def save_search_history(self, user_id, query, answer, chunk_ids, serialized_docs):
        try:
            history = SearchHistory.objects.create(
                user_id=user_id,
                query=query,
                answer=answer,
                source_documents=serialized_docs,
                chunk_ids=chunk_ids
            )
            logger.info("Search history saved successfully.")
            return history.id
        except Exception as e:
            logger.error(f"Error saving search history: {e}")
            raise

    def retrieve_search_history_by_user(self, user_id):
        try:
            return list(
                SearchHistory.objects
                .filter(user_id=user_id)
                .order_by('-timestamp')
                .values('id', 'query', 'timestamp')
            )
        except Exception as e:
            logger.error(f"Error retrieving search history: {e}")
            return []

    def retrieve_search_history_item(self, history_id):
        try:
            history = SearchHistory.objects.filter(pk=history_id).first()
            return model_to_dict(history) if history else None
        except Exception as e:
            logger.error(f"Error retrieving search history item: {e}")
            return None

    def delete_search_history_item(self, history_id):
        try:
            deleted_count, _ = SearchHistory.objects.filter(pk=history_id).delete()
            if deleted_count > 0:
                logger.info(f"Deleted history item with ID {history_id}.")
        except Exception as e:
            logger.error(f"Error deleting history item: {e}")

    def clear_search_history_for_user(self, user_id):
        try:
            SearchHistory.objects.filter(user_id=user_id).delete()
            logger.info(f"Cleared all search history for user {user_id}.")
        except Exception as e:
            logger.error(f"Error clearing search history for user {user_id}: {e}")

    def get_academicitem_ids_from_text_ids(self, text_ids: list[int]) -> list[int]:
        mapping = dict(
            AcademicPaperText.objects
            .filter(id__in=text_ids)
            .values_list("id", "paper_id")
        )
        return [mapping[tid] for tid in text_ids if tid in mapping]


