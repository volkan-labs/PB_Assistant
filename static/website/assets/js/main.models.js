async function loadModels() {
    const ollamaModelsDropdown = $('#ollamaModels');
    ollamaModelsDropdown.html('<option>Loading models…</option>');
    ollamaModelsDropdown.prop('disabled', true);

    try {
        const result = await fetch('/api/ollama/models/');
        const data = await result.json();
        if (!result.ok) throw new Error(data.error || 'Failed to fetch models');

        const availableModels = data.models || [];
        if (availableModels.length === 0) {
            showError('No models found. Is Ollama running? Try `ollama serve` and `ollama pull <model>`.');
            return;
        }
        ollamaModelsDropdown.html(availableModels.map(n => `<option value="${n}">${n}</option>`).join(''));
        ollamaModelsDropdown.prop('disabled', false); // important: enabled so it gets submitted
    } catch (e) {
        ollamaModelsDropdown.html('<option value="">Error loading models</option>');
        showError('Could not reach Ollama. Check your Docker compose and OLLAMA_BASE_URL.');
    }
}
