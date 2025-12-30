# PB Assistant

## Project Overview

PB Assistant is a Django-based application designed to assist with managing and querying knowledge related to Planetary Boundaries. It leverages a vector database (PostgreSQL with `pgvector`) for efficient similarity search, a robust PDF text extraction service (Grobid) for ingesting scientific documents, and local Large Language Models (LLMs) via Ollama for question-answering capabilities. The goal is to provide a powerful tool for researchers to explore and interact with a curated knowledge base of scientific literature.

## Architecture Overview

The PB Assistant project consists of several key components:

-   **Django Backend:** The core application, handling web requests, data management, and orchestration of other services.
-   **PostgreSQL with `pgvector`:** The primary database, extended with the `pgvector` extension for storing and querying high-dimensional vector embeddings.
-   **Grobid (in Docker):** An external service used for extracting structured text and metadata from PDF documents.
-   **Ollama (in Docker):** An external service providing a local environment for running various LLMs for inference.
-   **Text Processing Pipeline:** A set of Django apps and services (`textprocessing`) responsible for embedding text, ingesting PDFs, and performing QA chain operations.
-   **Frontend:** A web interface built with Django templates for user interaction, search queries, and displaying results.

At a high level, PDF documents are processed by the text pipeline, their content is converted into vector embeddings, and both the metadata and embeddings are stored in the PostgreSQL database. User queries are then sent through the Django backend to find relevant document chunks, which are provided as context to an LLM via Ollama to synthesize an answer.

---

# Local Development Setup Guide

This guide provides a complete walkthrough for installing, configuring, and running the PB Assistant application on your local machine.

## Prerequisites

Before starting, ensure you have the following installed:

-   Python 3.10+
-   Docker & Docker Compose
-   Git (optional, for cloning the repository)

You will also need at least 8GB of RAM and 10GB of free disk space for the Docker images, models, and PDF documents.

## Project Setup

This project uses a Python virtual environment to manage dependencies.

### Create a Virtual Environment

From the project root, create a new virtual environment:

    python -m venv .venv

### Activate the Virtual Environment

-   **Windows:**

        .venv\Scripts\activate

-   **macOS / Linux:**

        source .venv/bin/activate

To verify that the environment is active, run `which python` (on macOS/Linux) or `where python` (on Windows). The output should point to the Python interpreter inside your `.venv` directory.

### Install Python Dependencies

Inside the activated virtual environment, upgrade `pip` and then install the required packages from `requirements.txt`:

    python -m pip install --upgrade pip
    pip install -r requirements.txt

## Docker Setup

The project's external dependencies (PostgreSQL, Grobid, and Ollama) are managed via Docker Compose.

### Create the `.env` File

Create a `.env` file in the project root. This file holds local environment variables and is ignored by Git. The Django settings are configured to load this file using `python-dotenv`.

Fill it with the following content, replacing placeholder values as needed:

    POSTGRES_DB=your_db_name
    POSTGRES_USER=your_username
    POSTGRES_PASSWORD=your_password
    POSTGRES_HOST=localhost
    POSTGRES_PORT=5432

    GROBID_URL=http://localhost:8070

    OLLAMA_BASE_URL=http://localhost:11434

### Start Docker Containers

To start the services in the background (detached mode), run:

    docker-compose up -d

Allow a minute or two for all services to initialize. You can check the status of the containers with `docker-compose ps`.

### Pull Ollama Models

To pull the LLM models you want to use, execute the `ollama pull` command directly within the running container using `docker-compose exec`. You can find the service name (e.g., `ollama`) in your `docker-compose.yaml` file.

For example:

    docker-compose exec ollama ollama pull llama3
    docker-compose exec ollama ollama pull mistral

## Database Setup

With the database container running, you can now set up the database schema.

### Apply Database Migrations

This repository includes the initial database schema as Django migration files. To apply them, simply run:

    python manage.py migrate

This command will set up all the necessary tables and enable the `pgvector` extension.

### For Developers: Creating New Migrations
If you modify a model in `PB_Assistant/models.py`, you will need to generate a new database migration. The instructions below are for this purpose and are **not** needed for initial setup.

1.  **Creating the `pgvector` Extension (First time on a new DB):** If you were starting a new project from scratch without the existing migration files, you would first need a migration to enable the `pgvector` extension.
    ```bash
    python manage.py makemigrations --empty PB_Assistant --name create_pgvector_extension
    ```
    You would then edit the generated file to contain `migrations.RunSQL("CREATE EXTENSION IF NOT EXISTS vector;")`. Since this is already done in `0001_create_pgvector_extension.py`, you do not need to do this now.

2.  **Generating Model Migrations:** After changing a model, create a new migration with:
    ```bash
    python manage.py makemigrations
    ```

3.  **Applying Migrations:** To apply any new or pending migrations, run:
    ```bash
    python manage.py migrate
    ```

## Create an Admin User

To access the Django admin panel, you need to create a superuser:

    python manage.py createsuperuser

Follow the prompts to set up your username and password. You can log in to the admin panel later at `http://127.0.0.1:8000/admin/`.

## Creating Initial Content

The application requires `PlanetaryBoundary` objects to be created before importing PDFs.

### Add a Planetary Boundary

To add initial data, enter the Django interactive shell:

    python manage.py shell

Once in the shell, import the model and create a new instance:

```python
from PB_Assistant.models import PlanetaryBoundary
PlanetaryBoundary.objects.create(name='Climate Change', short_name='cc')
```

Repeat this for each boundary you want to track. Alternatively, you can add them from the admin panel after starting the application. Type `exit()` to leave the shell.

### Import PDFs

Import PDF files belonging to a particular boundary using the `import_pdfs` command:

    python manage.py import_pdfs --folder path/to/your/pdfs --boundary cc

Where:
-   `--folder`: The path to the folder containing your PDF documents.
-   `--boundary`: The `short_name` of the `PlanetaryBoundary` to associate the PDFs with.

## Start the Application

Finally, run the Django development server:

    python manage.py runserver

Open your browser to `http://127.0.0.1:8000/`.

---

# Project Documentation

## Contributing

We welcome contributions to the PB Assistant project! To contribute:

1.  Fork the repository and clone it to your local machine.
2.  Set up your local development environment by following the instructions in this `README.md`.
3.  Create a new branch for your feature or bug fix (`git checkout -b feature/my-new-feature`).
4.  Make your changes, ensuring to follow existing code style and conventions.
5.  Write or update tests for your changes.
6.  Ensure all tests pass.
7.  Submit a pull request with a clear description of your changes.

## License

This project is currently unlicensed. It is highly recommended to add a `LICENSE` file to the root of the repository to specify the terms under which this software can be used, modified, and distributed. Popular open-source licenses include MIT, Apache 2.0, or GPL.

## Troubleshooting

-   **Port Conflicts:** If `docker-compose up` or `runserver` fails with an error about a "port already in use," another service on your machine is using that port.
    -   For the Django server, run it on a different port: `python manage.py runserver 8001`.
    -   For Docker services, check which port is in use and either stop the conflicting service or change the port mapping in `docker-compose.yaml` and your `.env` file.

-   **Docker Issues:** If `docker-compose` commands fail, ensure the Docker Desktop application is running. On Linux, you may encounter permission errors if your user is not in the `docker` group.