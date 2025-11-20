class ArticleRenderer:
    @staticmethod
    def render_articles(articles):
        """
        Converts a list of Article objects into a list of dictionaries for rendering in the template.
        """
        return [
            {
                "doi": article["doi"],
                "title": article["title"],
                "year": article["publication_year"] or "N/A",
                "url_source": "https://doi.org/"+ article["doi"] if article["doi"] else "",
                "authors": article["authors_string"],
                "journal": article["source"] or "N/A",
            }
            for article in articles
        ]

    @staticmethod
    def render_articles_and_contents(articles, retrieved_docs, chunk_ids):
        return [
            {
                "id": article["id"],
                "doi": article["doi"],
                "title": article["title"],
                "year": article["publication_year"] or "N/A", ##
                "url_source": "https://doi.org/"+ article["doi"] if article["doi"] else "",
                "authors_display": (
                    ', '.join([a.strip() for a in article['authors_string'].split(',')[:3]]) +
                    ('...' if len(article['authors_string'].split(',')) > 3 else '')
                    if article.get('authors_string') else 'N/A'
                ),
                "journal": article["source"] or "N/A",
                "page_contents": [(doc["page_content"]).replace('\"', '\'') for doc in retrieved_docs if doc["metadata"]["id"] == article["academicpaper_text_id"] and doc["metadata"]["chunk_id"] in list(chunk_ids)],
                "page_contents_not_used_by_llm": [(doc["page_content"]).replace('\"', '\'') for doc in retrieved_docs if doc["metadata"]["id"] == article["academicpaper_text_id"] and doc["metadata"]["chunk_id"] not in list(chunk_ids)]
            }
            for article in articles
        ]


