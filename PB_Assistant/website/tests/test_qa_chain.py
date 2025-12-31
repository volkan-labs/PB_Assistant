from django.test import TestCase
from unittest.mock import patch, MagicMock, ANY
from PB_Assistant.website.services.qa_chain import normalize, parse_llm_output, process_qa_response, build_llm_chain, build_custom_retrieval_qa_chain, get_ollama_llm
from PB_Assistant.models import AcademicPaperTextEmbedding, AcademicPaperText, AcademicPaper
from langchain_classic.schema import Document as LangchainDocument
import uuid
import json

class QAServiceFunctionsTest(TestCase):

    def test_normalize(self):
        # Test case 1: Normal input
        input_dict_1 = {"response": "  Hello World  ", "chunk_id_list": ["1", "2"]}
        expected_output_1 = {"response": "Hello World", "chunk_id_list": ["1", "2"]}
        self.assertEqual(normalize(input_dict_1), expected_output_1)

        # Test case 2: Empty response
        input_dict_2 = {"response": "", "chunk_id_list": ["1"]}
        expected_output_2 = {"response": "", "chunk_id_list": ["1"]}
        self.assertEqual(normalize(input_dict_2), expected_output_2)

        # Test case 3: No chunk_id_list
        input_dict_3 = {"response": "Response only"}
        expected_output_3 = {"response": "Response only", "chunk_id_list": []}
        self.assertEqual(normalize(input_dict_3), expected_output_3)

        # Test case 4: Non-list chunk_id_list
        input_dict_4 = {"response": "Response", "chunk_id_list": "not a list"}
        expected_output_4 = {"response": "Response", "chunk_id_list": []}
        self.assertEqual(normalize(input_dict_4), expected_output_4)

    def test_parse_llm_output(self):
        # Test case 1: Valid JSON output
        llm_output_1 = '```json\n{"response": "Test answer.", "chunk_id_list": ["a:1", "a:2"]}\n```'
        expected_response_1 = "Test answer."
        expected_chunk_ids_1 = ["a:1", "a:2"]
        response, chunk_ids = parse_llm_output(llm_output_1)
        self.assertEqual(response, expected_response_1)
        self.assertEqual(chunk_ids, expected_chunk_ids_1)

        # Test case 2: JSON without code block
        llm_output_2 = '{"response": "Another answer.", "chunk_id_list": ["b:1"]}'
        expected_response_2 = "Another answer."
        expected_chunk_ids_2 = ["b:1"]
        response, chunk_ids = parse_llm_output(llm_output_2)
        self.assertEqual(response, expected_response_2)
        self.assertEqual(chunk_ids, expected_chunk_ids_2)

        # Test case 3: Invalid JSON
        llm_output_3 = 'This is not JSON'
        expected_response_3 = ""
        expected_chunk_ids_3 = []
        response, chunk_ids = parse_llm_output(llm_output_3)
        self.assertEqual(response, expected_response_3)
        self.assertEqual(chunk_ids, expected_chunk_ids_3)

        # Test case 4: Missing response key
        llm_output_4 = '{"chunk_id_list": ["c:1"]}'
        expected_response_4 = ""
        expected_chunk_ids_4 = ["c:1"]
        response, chunk_ids = parse_llm_output(llm_output_4)
        self.assertEqual(response, expected_response_4)
        self.assertEqual(chunk_ids, expected_chunk_ids_4)

        # Test case 5: Missing chunk_id_list key
        llm_output_5 = '{"response": "Just response."}'
        expected_response_5 = "Just response."
        expected_chunk_ids_5 = []
        response, chunk_ids = parse_llm_output(llm_output_5)
        self.assertEqual(response, expected_response_5)
        self.assertEqual(chunk_ids, expected_chunk_ids_5)

    @patch('PB_Assistant.website.services.qa_chain.parse_llm_output')
    def test_process_qa_response_with_retrieved_documents(self, mock_parse_llm_output):
        mock_parse_llm_output.return_value = ("Parsed Answer", ["chunk1:0", "chunk2:0"])
        
        mock_doc1_metadata = {"id": "doc1_uuid", "chunk_id": "chunk1:0"}
        mock_doc2_metadata = {"id": "doc2_uuid", "chunk_id": "chunk2:0"}
        
        mock_retrieved_documents = [
            MagicMock(metadata=mock_doc1_metadata),
            MagicMock(metadata=mock_doc2_metadata),
            MagicMock(metadata={"id": "doc3_uuid", "chunk_id": "chunk3:0"}) # Not in chunk_ids
        ]

        result_str = "LLM raw result"
        answer, chunk_ids, doc_ids = process_qa_response(result_str, mock_retrieved_documents)

        self.assertEqual(answer, "Parsed Answer")
        self.assertEqual(list(chunk_ids), ["chunk1:0", "chunk2:0"])
        self.assertEqual(list(doc_ids), ["doc1_uuid", "doc2_uuid"])
        mock_parse_llm_output.assert_called_once_with(result_str)

    def test_process_qa_response_no_retrieved_documents(self):
        result_str = "LLM raw result"
        retrieved_documents = []

        answer, chunk_ids, doc_ids = process_qa_response(result_str, retrieved_documents)

        self.assertEqual(answer, "The answer is not available in the documents.")
        self.assertEqual(chunk_ids, [])
        self.assertEqual(doc_ids, [])

    @patch('PB_Assistant.website.services.qa_chain.parse_llm_output')
    def test_process_qa_response_empty_chunk_ids_from_llm(self, mock_parse_llm_output):
        mock_parse_llm_output.return_value = ("Parsed Answer", [])
        
        mock_doc1_metadata = {"id": "doc1_uuid", "chunk_id": "chunk1:0"}
        mock_retrieved_documents = [MagicMock(metadata=mock_doc1_metadata)]

        result_str = "LLM raw result"
        answer, chunk_ids, doc_ids = process_qa_response(result_str, mock_retrieved_documents)

        self.assertEqual(answer, "Parsed Answer")
        self.assertEqual(chunk_ids, [])
        self.assertEqual(doc_ids, [])
        mock_parse_llm_output.assert_called_once_with(result_str)

    @patch('PB_Assistant.website.services.qa_chain.LLMChain')
    @patch('PB_Assistant.website.services.qa_chain.get_ollama_llm')
    def test_build_llm_chain(self, mock_get_ollama_llm, mock_LLMChain):
        mock_llm_instance = MagicMock()
        mock_get_ollama_llm.return_value = mock_llm_instance
        model_name = "test_model"

        llm_chain = build_llm_chain(model_name)

        mock_get_ollama_llm.assert_called_once_with(model_name=model_name)
        mock_LLMChain.assert_called_once_with(llm=mock_llm_instance, prompt=ANY) # ANY will match the PromptTemplate
        self.assertEqual(llm_chain, mock_LLMChain.return_value)


    @patch('PB_Assistant.website.services.qa_chain.RetrievalQA')
    @patch('PB_Assistant.website.services.qa_chain.StuffDocumentsChain')
    @patch('PB_Assistant.website.services.qa_chain.AcademicPaperTextEmbedding.objects.annotate')
    def test_build_custom_retrieval_qa_chain(self, mock_annotate, mock_StuffDocumentsChain, mock_RetrievalQA):
        # Mock embeddings QuerySet
        mock_embeddings_qs = MagicMock()
        mock_embeddings_qs.order_by.return_value = [
            MagicMock(academicpaper_text_id="test_paper_id_1", chunk_index=0, content="content 1"),
            MagicMock(academicpaper_text_id="test_paper_id_2", chunk_index=0, content="content 2"),
        ]
        mock_annotate.return_value = mock_embeddings_qs
        
        mock_llm_chain = MagicMock()
        mock_llm_chain.prompt = MagicMock(input_variables=["context", "question"])

        query_vector = [0.1] * 768

        retrieval_qa_chain = build_custom_retrieval_qa_chain(mock_llm_chain, query_vector)

        mock_annotate.assert_called_once()
        mock_StuffDocumentsChain.assert_called_once()
        mock_RetrievalQA.assert_called_once()
        self.assertEqual(retrieval_qa_chain, mock_RetrievalQA.return_value)
