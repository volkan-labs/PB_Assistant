import json
import logging
from typing import List
from django.conf import settings
from langchain_classic.chains import RetrievalQA
from langchain_classic.chains.combine_documents.stuff import StuffDocumentsChain
from langchain_classic.chains.llm import LLMChain
from langchain_classic.output_parsers import StructuredOutputParser, ResponseSchema
from langchain_classic.prompts import PromptTemplate
from langchain_classic.schema import Document as LangchainDocument
from langchain_community.llms import Ollama
from langchain_core.runnables import RunnableLambda
from langchain_core.documents import Document
from langchain_core.callbacks import CallbackManagerForRetrieverRun
from langchain_core.retrievers import BaseRetriever
from pgvector.django import CosineDistance
from PB_Assistant.models import AcademicPaperTextEmbedding

logger = logging.getLogger(__name__)

_llm_cache = {}

def get_ollama_llm(model_name:str):
    if model_name not in _llm_cache:
        llm = Ollama(
            model=model_name,
            base_url= settings.OLLAMA_BASE_URL,
            temperature=0.0,
            top_p=1.0,
        )
        llm = llm.bind(seed=42, min_p=0.0, keep_alive="100m")
        _llm_cache[model_name] = llm
    return _llm_cache[model_name]

def normalize(d: dict) -> dict:
    resp = str(d.get("response", "")).strip()
    cil = d.get("chunk_id_list", [])
    if not isinstance(cil, list):
        cil = []
    return {"response": resp, "chunk_id_list": [str(x) for x in cil]}

def build_llm_chain(model_name:str) -> LLMChain:
    response_schemas = [
        ResponseSchema(
            name="response",
            description="A string containing the answer. If the context is empty or insufficient, return 'context not available'."
        ),
        ResponseSchema(
            name="chunk_id_list",
            description="A list of chunk ids (strings) associated with the contents directly used to derive the answer. If context is insufficient, return an empty list."
        )
    ]

    output_parser = StructuredOutputParser.from_response_schemas(response_schemas)
    raw_format_instructions = output_parser.get_format_instructions()
    escaped_format_instructions = raw_format_instructions.replace("{", "{{").replace("}", "}}")

    base_template = """
    You are given context fragments (content + chunk id). Use ONLY these fragments to answer the following question.
    If the answer isn't supported, return "context not available".

    Output MUST be a valid JSON object with this format:
    {format_instructions}

    Rules:
    - Output ONLY the JSON (no prose, no backticks).
    - Keep 'Answer' concise (<=120 words).
    - Include ONLY the chunk ids you actually used; otherwise [].

    Context:
    {{context}}

    Question: {{question}}

    Answer:
    """
    final_prompt_template = base_template.format(format_instructions=escaped_format_instructions)

    main_prompt = PromptTemplate(
        input_variables=["context", "question"],
        template=final_prompt_template,
    )

    llm = get_ollama_llm(model_name=model_name)
    return LLMChain(llm=llm, prompt=main_prompt)


def build_custom_retrieval_qa_chain(llm_chain: LLMChain, query_vector) -> RetrievalQA:
    """
    Custom RetrievalQA chain using AcademicPaperTextEmbedding instead of vector_store.
    """
    # Find similar embeddings
    embeddings_qs = AcademicPaperTextEmbedding.objects.annotate(
        distance=CosineDistance('vector', query_vector)
    ).order_by('distance')[:4]

    # Build Document objects
    documents = []
    for emb in embeddings_qs:
        metadata = {
            "chunk_id": f"{emb.academicpaper_text_id}:{emb.chunk_index}",
            "id": emb.academicpaper_text_id,
        }
        documents.append(LangchainDocument(page_content=emb.content, metadata=metadata))

    document_prompt = PromptTemplate(
        input_variables=["page_content", "chunk_id"],
        template="Fragment:\ncontent: {page_content}\nchunk_id: {chunk_id}\n",
    )

    combine_documents_chain = StuffDocumentsChain(
        llm_chain=llm_chain,
        document_variable_name="context",
        document_prompt=document_prompt,
    )

    class CustomRetriever(BaseRetriever):
        docs: List[Document]  # declare as a pydantic field

        def _get_relevant_documents(
            self,
            query: str,
            *,
            run_manager: CallbackManagerForRetrieverRun,
        ) -> List[Document]:
            # your retrieval logic; here we return all docs
            return self.docs

    return RetrievalQA(
        combine_documents_chain=combine_documents_chain,
        retriever=CustomRetriever(docs=documents),
        return_source_documents=True,
    )


def process_qa_response(result: str, retrieved_documents: list) -> tuple:
    """
    Process the QA chain response and return a tuple:
    (answer, chunk_id_list, article_ids, doc_ids)

    If no documents are retrieved, returns a default answer and empty lists.
    """
    doc_ids = []
    if not retrieved_documents:
        answer = "The answer is not available in the documents."
        chunk_ids = []
    else:
        answer, chunk_ids = parse_llm_output(result)
        if chunk_ids:
            pairs = [
                (d.metadata["id"], d.metadata["chunk_id"])
                for d in retrieved_documents if d.metadata.get("chunk_id") in chunk_ids
            ]
            if pairs:
                doc_ids, chunk_ids = zip(*pairs)
    return answer, chunk_ids, doc_ids


def parse_llm_output(llm_output):
    # If the output contains extra text (like the explanation), we need to extract just the JSON part.
    # One approach is to find the first '{' and the last '}' in the string:
    start_index = llm_output.find('{')
    end_index = llm_output.find('}') + 1
    json_str = llm_output[start_index:end_index]

    # Parse the JSON string:
    try:
        parsed = json.loads(json_str)
    except json.JSONDecodeError as e:
        print("Error parsing JSON:", e)
        parsed = {}

    # Extract the values:
    response_text = parsed.get("response", "")
    chunk_id_list = parsed.get("chunk_id_list", [])
    return response_text, chunk_id_list

def serialize_documents(docs):
    """
    Convert a list of Document objects into a list of dictionaries.
    """
    serialized = []
    for doc in docs:
        # Assuming each Document has attributes 'page_content' and 'metadata'
        serialized.append({
            "page_content": doc.page_content,
            "metadata": doc.metadata
        })
    return serialized
